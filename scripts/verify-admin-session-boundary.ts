/**
 * Task 40G.9 — Admin Server Action authorization boundary verification.
 *
 * Proves, against a RUNNING production server (npm run build && npm run start),
 * that the 40G.8 HIGH finding is fixed:
 *
 *   A. Session-token integrity: valid / absent / malformed / tampered /
 *      expired / wrongly-signed tokens.
 *   B. Unauthenticated direct Server Action invocation — read, draft read,
 *      create, delete, asset upload — must be DENIED, and the denied write
 *      must leave NO row behind (service-role cross-check).
 *   C. Mandatory regression: fake localStorage admin flag + no server session
 *      -> Server Action still DENIED (localStorage is UX only).
 *   D. Invalid / tampered / expired / wrong-secret cookie over HTTP -> DENIED.
 *   E. Valid admin session (issued by adminLoginAction) -> representative
 *      read + create + delete operations SUCCEED; cookie attributes checked.
 *   F. adminLogoutAction clears the session cookie server-side.
 *
 * Self-cleaning: the only row created is a probe department, deleted at the end.
 * Credentials and secret values are never printed.
 *
 * Usage (from app/firstprinciples-app):
 *   npm run build && npm run start         # shell 1 — must serve the new build
 *   npm run verify:admin-session-boundary  # shell 2
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "../lib/adminSession";

const BASE_URL = (process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;

const TAG = `verify-40g9-${Date.now()}`;
const UNAUTHORIZED_PREFIX = "Unauthorized.";

let failures = 0;
function check(label: string, pass: boolean, detail = "") {
  if (!pass) failures += 1;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${!pass && detail ? ` — ${detail}` : ""}`);
}
function skip(label: string, why: string) {
  console.log(`  SKIP  ${label} — ${why}`);
}

// ---------------------------------------------------------------------------
// Server Action invocation over the real wire (Next.js `Next-Action` protocol)
// ---------------------------------------------------------------------------

interface ActionMeta {
  id: string;
  workers: string[];
}

interface Invocation {
  status: number;
  ok?: boolean;
  data?: unknown;
  error?: string;
  thrown?: boolean;
  setCookie: string | null;
  raw: string;
}

function loadActions(): Map<string, ActionMeta> {
  const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8"));
  const map = new Map<string, ActionMeta>();
  for (const [id, entry] of Object.entries(manifest.node ?? {}) as Array<[string, any]>) {
    if (entry?.filename === "lib/adminContentActions.ts" && entry.exportedName) {
      map.set(entry.exportedName, { id, workers: Object.keys(entry.workers ?? {}) });
    }
  }
  return map;
}

function routeForWorker(worker: string): string {
  const page = worker.replace(/\\/g, "/").replace(/^app/, "").replace(/\/page$/, "");
  const route = page.replace(/\[[^\]]+\]/g, "placeholder");
  return route.startsWith("/") ? route : `/${route}`;
}

async function invoke(
  actions: Map<string, ActionMeta>,
  name: string,
  args: unknown[],
  opts: { cookie?: string; extraHeaders?: Record<string, string> } = {},
): Promise<Invocation> {
  const meta = actions.get(name);
  if (!meta) {
    throw new Error(`Action "${name}" is not in the build manifest — run \`npm run build\` so the server runs the 40G.9 code.`);
  }
  const worker = meta.workers.find((w) => !w.includes("[")) ?? meta.workers[0];
  if (!worker) throw new Error(`No worker page registered for ${name}`);

  const headers: Record<string, string> = {
    "Next-Action": meta.id,
    "Content-Type": "text/plain;charset=UTF-8",
    ...(opts.extraHeaders ?? {}),
  };
  if (opts.cookie !== undefined) headers["Cookie"] = opts.cookie;

  const res = await fetch(`${BASE_URL}${routeForWorker(worker)}`, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
  });
  const raw = await res.text();

  let payload: any;
  for (const row of raw.split(/\r?\n/)) {
    if (row.startsWith("1:E")) {
      payload = { thrown: true, error: "The action threw before returning a value." };
      break;
    }
    if (row.startsWith("1:")) {
      try {
        payload = JSON.parse(row.slice(2));
      } catch {
        payload = undefined;
      }
      break;
    }
  }

  return {
    status: res.status,
    ok: payload?.ok,
    data: payload?.data,
    error: payload?.error,
    thrown: payload?.thrown === true,
    setCookie: res.headers.get("set-cookie"),
    raw,
  };
}

function isDenied(r: Invocation): boolean {
  return r.ok === false && typeof r.error === "string" && r.error.startsWith(UNAUTHORIZED_PREFIX);
}

function sessionCookieValue(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]*)`));
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Service-role cross-checks (prove denied operations never happened)
// ---------------------------------------------------------------------------

function service(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function departmentsByName(client: SupabaseClient, name: string): Promise<string[]> {
  const { data, error } = await client.from("departments").select("id").eq("name", name);
  if (error) throw error;
  return (data ?? []).map((row: any) => row.id as string);
}

async function departmentExists(client: SupabaseClient, id: string): Promise<boolean> {
  const { data, error } = await client.from("departments").select("id").eq("id", id).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function courseExists(client: SupabaseClient, id: string): Promise<boolean> {
  const { data, error } = await client.from("courses").select("id").eq("id", id).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

// ---------------------------------------------------------------------------

async function main() {
  const actions = loadActions();
  const svc = service();

  console.log("Task 40G.9 — admin Server Action authorization boundary");
  console.log(`target: ${BASE_URL} (probe tag ${TAG})\n`);

  console.log("0. Preconditions");
  check("build manifest registers adminLogoutAction", actions.has("adminLogoutAction"));
  check("ADMIN_SESSION_SECRET configured (value not printed)", Boolean(ADMIN_SESSION_SECRET));
  check("ADMIN_EMAIL / ADMIN_PASSWORD configured (values not printed)", Boolean(ADMIN_EMAIL && ADMIN_PASSWORD));

  let reachable = false;
  try {
    const probe = await fetch(`${BASE_URL}/admin/login`);
    reachable = probe.status === 200;
  } catch {
    reachable = false;
  }
  check("server reachable at BASE_URL (npm run build && npm run start)", reachable);
  if (!reachable) {
    console.log("\nFAIL — server not reachable; re-run after starting it.");
    process.exit(1);
  }

  // --- A. token integrity ----------------------------------------------------
  console.log("\nA. Session token integrity");
  const now = Date.now();
  const validToken = createAdminSessionToken(now);
  const [payloadPart, signaturePart] = validToken.split(".");
  check("valid signed token verifies", verifyAdminSessionToken(validToken)?.subject === "admin");
  check("absent token -> denied", verifyAdminSessionToken(undefined) === null);
  check("malformed token -> denied", verifyAdminSessionToken("not-a-token") === null);
  const flipped = (c: string) => (c === "A" ? "B" : "A");
  const tamperedSig = `${payloadPart}.${flipped(signaturePart[0])}${signaturePart.slice(1)}`;
  check("tampered signature -> denied", verifyAdminSessionToken(tamperedSig) === null);
  const tamperedPayload = `${payloadPart.slice(0, -1)}${flipped(payloadPart.slice(-1))}.${signaturePart}`;
  check("tampered payload -> denied", verifyAdminSessionToken(tamperedPayload) === null);
  const expiredToken = createAdminSessionToken(now - (ADMIN_SESSION_MAX_AGE_SECONDS + 60) * 1000);
  check("expired token -> denied", verifyAdminSessionToken(expiredToken) === null);
  const foreignSecretSig = `${payloadPart}.${createHmac("sha256", "attacker-guess").update(payloadPart).digest("base64url")}`;
  check("token signed with wrong secret -> denied", verifyAdminSessionToken(foreignSecretSig) === null);

  // --- B. unauthenticated direct invocation ---------------------------------
  console.log("\nB. Unauthenticated direct Server Action invocation (no cookie)");
  const readR = await invoke(actions, "getAdminCoursesAction", []);
  check("READ  getAdminCoursesAction -> DENIED", isDenied(readR), `status=${readR.status} ok=${readR.ok} err=${readR.error ?? readR.raw.slice(0, 160)}`);

  const draftReadR = await invoke(actions, "getAdminQuestionsAction", []);
  check("READ draft content getAdminQuestionsAction -> DENIED", isDenied(draftReadR));

  const uploadR = await invoke(actions, "uploadLessonImageAction", ["math-151", "placeholder", "placeholder", null]);
  check("UPLOAD uploadLessonImageAction -> DENIED", isDenied(uploadR));

  const createR = await invoke(actions, "createDepartmentAction", [{ name: TAG, status: "draft" }]);
  check("WRITE createDepartmentAction -> DENIED", isDenied(createR));
  const leakedRows = await departmentsByName(svc, TAG);
  check("denied create left NO row in departments", leakedRows.length === 0, `found ${leakedRows.length} row(s)`);

  const deleteR = await invoke(actions, "deleteCourseAction", ["math-151"]);
  check("DELETE deleteCourseAction -> DENIED", isDenied(deleteR));
  check("target course still exists after denied delete", await courseExists(svc, "math-151"));

  // --- C. localStorage bypass (mandatory regression) -------------------------
  console.log("\nC. localStorage bypass regression (flag = true, server session absent)");
  const fakeFlagR = await invoke(actions, "getAdminCoursesAction", [], {
    extraHeaders: {
      Cookie: `first-principles-admin-auth=true; ${ADMIN_SESSION_COOKIE}=true`,
      "X-Admin-Auth": "true",
      "X-Local-Storage-Admin": "true",
    },
  });
  check("localStorage admin flag + forged headers -> DENIED", isDenied(fakeFlagR));

  // --- D. invalid / tampered / expired cookies over HTTP ---------------------
  console.log("\nD. Invalid, tampered and expired session cookies (HTTP)");
  const malformedR = await invoke(actions, "getAdminCoursesAction", [], { cookie: `${ADMIN_SESSION_COOKIE}=garbage` });
  check("malformed cookie -> DENIED", isDenied(malformedR));
  const tamperedHttpR = await invoke(actions, "getAdminCoursesAction", [], { cookie: `${ADMIN_SESSION_COOKIE}=${tamperedSig}` });
  check("tampered cookie -> DENIED", isDenied(tamperedHttpR));
  const expiredHttpR = await invoke(actions, "getAdminCoursesAction", [], { cookie: `${ADMIN_SESSION_COOKIE}=${expiredToken}` });
  check("expired cookie -> DENIED", isDenied(expiredHttpR));
  const foreignHttpR = await invoke(actions, "getAdminCoursesAction", [], { cookie: `${ADMIN_SESSION_COOKIE}=${foreignSecretSig}` });
  check("wrong-secret cookie -> DENIED", isDenied(foreignHttpR));

  // --- E. valid session ------------------------------------------------------
  console.log("\nE. Valid admin session");
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    skip("valid-session tests", "ADMIN_EMAIL / ADMIN_PASSWORD not configured");
  } else {
    const badLogin = await invoke(actions, "adminLoginAction", [ADMIN_EMAIL, "definitely-the-wrong-password"]);
    check("login with wrong password -> fails", badLogin.ok === false);
    check("failed login sets NO session cookie", sessionCookieValue(badLogin.setCookie) === null);

    const goodLogin = await invoke(actions, "adminLoginAction", [ADMIN_EMAIL, ADMIN_PASSWORD]);
    check("login with correct credentials -> succeeds", goodLogin.ok === true, `error=${goodLogin.error ?? goodLogin.raw.slice(0, 160)}`);
    const issued = sessionCookieValue(goodLogin.setCookie);
    const setCookie = goodLogin.setCookie ?? "";
    check("session cookie issued", Boolean(issued));
    check("cookie is HttpOnly", /HttpOnly/i.test(setCookie));
    check("cookie is Secure (production)", /Secure/i.test(setCookie));
    check("cookie is SameSite=Lax", /SameSite=Lax/i.test(setCookie));
    check(`cookie has explicit Max-Age=${ADMIN_SESSION_MAX_AGE_SECONDS}`, new RegExp(`Max-Age=${ADMIN_SESSION_MAX_AGE_SECONDS}`, "i").test(setCookie));
    check("cookie path-scoped to /", /Path=\//i.test(setCookie));
    check("cookie does not contain the admin password", !setCookie.includes(ADMIN_PASSWORD));
    check("cookie does not contain the signing secret", !setCookie.includes(ADMIN_SESSION_SECRET ?? ""));

    const validCookie = `${ADMIN_SESSION_COOKIE}=${issued}`;

    const authedRead = await invoke(actions, "getAdminCoursesAction", [], { cookie: validCookie });
    check("READ with valid session -> ALLOWED", authedRead.ok === true && Array.isArray(authedRead.data));

    const authedDraft = await invoke(actions, "getAdminQuestionsAction", [], { cookie: validCookie });
    check("READ draft content with valid session -> ALLOWED", authedDraft.ok === true);

    const authedCreate = await invoke(actions, "createDepartmentAction", [{ name: TAG, status: "draft" }], { cookie: validCookie });
    check("WRITE createDepartmentAction with valid session -> ALLOWED", authedCreate.ok === true);
    const createdId = (authedCreate.data as { id?: string } | undefined)?.id;
    check("created probe department has an id", Boolean(createdId));
    if (createdId) {
      check("probe row confirmed via service role", await departmentExists(svc, createdId));
      const authedDelete = await invoke(actions, "deleteDepartmentAction", [createdId], { cookie: validCookie });
      check("DELETE with valid session -> ALLOWED", authedDelete.ok === true);
      check("probe row removed (self-cleaning)", !(await departmentExists(svc, createdId)));
    }

    const authedUpload = await invoke(actions, "uploadLessonImageAction", ["math-151", "placeholder", "placeholder", null], { cookie: validCookie });
    check(
      "UPLOAD with valid session passes the guard (operation runs, not Unauthorized)",
      authedUpload.ok === false && typeof authedUpload.error === "string" && !authedUpload.error.startsWith(UNAUTHORIZED_PREFIX),
    );

    // --- F. server-side logout -----------------------------------------------
    console.log("\nF. Server-side logout");
    const logoutR = await invoke(actions, "adminLogoutAction", [], { cookie: validCookie });
    check("adminLogoutAction succeeds with a valid session", logoutR.ok === true);
    const cleared = logoutR.setCookie ?? "";
    check("logout response expires the session cookie", new RegExp(`${ADMIN_SESSION_COOKIE}=;`).test(cleared) && /Max-Age=0/i.test(cleared));
  }

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("verify-admin-session-boundary crashed:", error);
  process.exit(1);
});
