/**
 * Task 40G.7B — focused read-path boundary test for `public.assets`.
 *
 * Proves the two production client paths behave differently under the live
 * `public_assets_select_ready` RLS policy (status = 'ready'):
 *
 *   STUDENT  publishable key (the same key `createSupabaseServerClient()` uses)
 *            -> ready assets only
 *   ADMIN    service-role client (createSupabaseAdminClient) -> every status
 *
 * It also asserts the repository boundary: the "supabase" source without an
 * explicit client factory must throw, and a supplied factory must be the client
 * actually used for reads.
 *
 * Self-cleaning temporary probe rows only; baseline is captured and restored.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAssetRepository, createAssetSupabaseRepository } from "../lib/content/assetRepository";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TAG = `verify-40g7b-${Date.now()}`;
const READY = `${TAG}-ready`;
const DRAFT = `${TAG}-draft`;
const ARCHIVED = `${TAG}-archived`;

function client(key: string): SupabaseClient {
  return createClient(URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}: ${JSON.stringify(actual)}${pass ? "" : ` (expected ${JSON.stringify(expected)})`}`);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Accepts a query builder as well as a promise: supabase-js builders are
// thenable but are not Promise instances, so the parameter type must be loose.
async function rt<T>(fn: () => T | Promise<T>): Promise<T> {
  let last: any;
  for (let i = 0; i < 4; i++) {
    const r: any = await fn();
    if (!r.error) return r as T;
    last = r;
    await sleep(4000);
  }
  return last as T;
}

async function main() {
  const svc = client(SERVICE);
  const baseline = (await rt(() => svc.from("assets").select("id", { count: "exact", head: true }))).count ?? 0;
  console.log(`baseline asset rows = ${baseline}`);

  const ins = await rt(() => svc.from("assets").insert([
    { id: READY, type: "image", name: "PROBE-READY", source_kind: "external", url: "https://probe.invalid/ready.png", status: "ready", metadata: { probe: "READY-40G7B" }, tags: ["probe"], alt_text: "probe ready" },
    { id: DRAFT, type: "image", name: "PROBE-DRAFT", source_kind: "external", url: "https://probe.invalid/draft.png", status: "draft", metadata: { probe: "DRAFT-40G7B" }, tags: ["probe"] },
    { id: ARCHIVED, type: "image", name: "PROBE-ARCHIVED", source_kind: "external", url: "https://probe.invalid/archived.png", status: "archived", metadata: { probe: "ARCHIVED-40G7B" }, tags: ["probe"] },
  ] as never));
  if (ins.error) throw ins.error;
  console.log(`probes inserted: ${TAG}\n`);

  // STUDENT path: the publishable key, exactly what createSupabaseServerClient uses.
  const studentRepo = createAssetSupabaseRepository(() => client(PUBLISHABLE));

  console.log("STUDENT path (publishable key, RLS enforced):");
  const gotReady = await studentRepo.getAsset(READY);
  check("ready asset readable", gotReady?.id, READY);
  check("ready asset url preserved", gotReady?.source.url, "https://probe.invalid/ready.png");
  check("draft asset hidden", await studentRepo.getAsset(DRAFT), undefined);
  check("archived asset hidden", await studentRepo.getAsset(ARCHIVED), undefined);

  const byIds = await studentRepo.getAssetsByIds([READY, DRAFT, ARCHIVED]);
  check("getAssetsByIds returns only ready", byIds.map((a) => a.id), [READY]);
  const broad = await studentRepo.listAssets();
  check("broad list exposes only ready", broad.every((a) => a.status === "ready"), true);
  check("broad list hides draft id", broad.some((a) => a.id === DRAFT), false);
  check("broad list hides archived id", broad.some((a) => a.id === ARCHIVED), false);

  console.log("\nBOUNDARY:");
  let threw = false;
  try { createAssetRepository("supabase"); } catch { threw = true; }
  check('createAssetRepository("supabase") without a factory throws', threw, true);
  const svcRepo = createAssetRepository("supabase", () => client(SERVICE));
  check("explicit factory is actually used for reads", (await svcRepo.listAssets()).some((a) => a.id === DRAFT), true);

  console.log("\nADMIN path (explicit service-role client):");
  const adminRepo = createAssetSupabaseRepository(() => client(SERVICE));
  check("draft readable by admin", (await adminRepo.getAsset(DRAFT))?.id, DRAFT);
  check("archived readable by admin", (await adminRepo.getAsset(ARCHIVED))?.id, ARCHIVED);
  check("ready readable by admin", (await adminRepo.getAsset(READY))?.id, READY);
  check("admin listAssets sees all three", (await adminRepo.getAssetsByIds([READY, DRAFT, ARCHIVED])).length, 3);

  console.log("\nCLEANUP:");
  await rt(() => svc.from("assets").delete().like("id", `${TAG}%`));
  const left = (await rt(() => svc.from("assets").select("id").like("id", `${TAG}%`))).data ?? [];
  check("temporary rows remaining", left.length, 0);
  check("asset count back to baseline", (await rt(() => svc.from("assets").select("id", { count: "exact", head: true }))).count, baseline);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  if (failures > 0) process.exitCode = 1;
}
main().catch((e) => {
  console.error("CRASH:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});