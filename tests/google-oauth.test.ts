import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  completeOAuthCallback,
  getSafeOAuthDestination,
  isOAuthStudentMappingValid,
} from "../lib/auth/oauthCallback";

test("OAuth callback accepts safe same-origin relative destinations", () => {
  assert.equal(getSafeOAuthDestination("/dashboard?tab=progress#recent"), "/dashboard?tab=progress#recent");
  assert.equal(getSafeOAuthDestination(null), "/courses");
});

test("OAuth callback rejects external, protocol-relative, and backslash redirects", () => {
  for (const value of ["https://evil.example", "//evil.example", "/\\\\evil.example", "/\\evil.example"]) {
    assert.equal(getSafeOAuthDestination(value), "/courses");
  }
});

test("OAuth callback rejects missing code and provider errors without exchanging a code", async () => {
  let exchanges = 0;
  const exchange = async () => {
    exchanges += 1;
    return true;
  };

  assert.deepEqual(
    await completeOAuthCallback({ code: null, next: "/dashboard", error: null }, exchange),
    { ok: false, destination: "/auth/error?reason=oauth" },
  );
  assert.deepEqual(
    await completeOAuthCallback({ code: "code", next: "/dashboard", error: "access_denied" }, exchange),
    { ok: false, destination: "/auth/error?reason=oauth" },
  );
  assert.equal(exchanges, 0);
});

test("OAuth callback handles rejected or failed exchanges with a generic destination", async () => {
  const rejected = await completeOAuthCallback(
    { code: "used-code", next: "/dashboard", error: null },
    async () => false,
  );
  const thrown = await completeOAuthCallback(
    { code: "invalid-code", next: "/dashboard", error: null },
    async () => {
      throw new Error("sensitive provider detail");
    },
  );

  assert.deepEqual(rejected, { ok: false, destination: "/auth/error?reason=oauth" });
  assert.deepEqual(thrown, { ok: false, destination: "/auth/error?reason=oauth" });
});

test("OAuth callback routes successful signup to onboarding and rejects replayed codes", async () => {
  let codeAvailable = true;
  const exchange = async () => {
    if (!codeAvailable) return false;
    codeAvailable = false;
    return true;
  };
  const params = { code: "one-time-code", next: "/courses?onboarding=true", error: null };

  assert.deepEqual(await completeOAuthCallback(params, exchange), {
    ok: true,
    destination: "/courses?onboarding=true",
  });
  assert.deepEqual(await completeOAuthCallback(params, exchange), {
    ok: false,
    destination: "/auth/error?reason=oauth",
  });
});

test("OAuth callback accepts a linked Google identity mapped to the original auth user", () => {
  assert.equal(
    isOAuthStudentMappingValid({
      studentMappingFound: true,
      identityProviders: ["email", "google"],
      requiredProvider: "google",
    }),
    true,
  );
});

test("OAuth callback rejects a Google identity not linked to the mapped auth user", () => {
  assert.equal(
    isOAuthStudentMappingValid({
      studentMappingFound: false,
      identityProviders: ["google"],
      requiredProvider: "google",
    }),
    false,
  );
});

test("OAuth callback does not authorize by matching email or count an unlinked password identity as Google", () => {
  assert.equal(
    isOAuthStudentMappingValid({
      studentMappingFound: true,
      identityProviders: ["email"],
      requiredProvider: "google",
    }),
    false,
  );
  assert.equal(
    isOAuthStudentMappingValid({
      studentMappingFound: false,
      identityProviders: ["google"],
      requiredProvider: "google",
    }),
    false,
  );
});

test("Google-first signup is accepted only after its own auth user has a student mapping", () => {
  assert.equal(
    isOAuthStudentMappingValid({
      studentMappingFound: true,
      identityProviders: ["google"],
    }),
    true,
  );
  assert.equal(
    isOAuthStudentMappingValid({
      studentMappingFound: false,
      identityProviders: ["google"],
    }),
    false,
  );
});

test("email/password sign-in remains and existing Google linking is explicit and authenticated", () => {
  const authModal = readFileSync(new URL("../components/auth/AuthModal.tsx", import.meta.url), "utf8");
  const settings = readFileSync(new URL("../app/(platform)/settings/SettingsClient.tsx", import.meta.url), "utf8");
  const callback = readFileSync(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8");

  assert.match(authModal, /signInWithPassword/);
  assert.match(authModal, /signInWithOAuth\(\{\s*provider: "google"/);
  assert.match(settings, /auth\.getUser\(\)/);
  assert.match(settings, /auth\.linkIdentity\(\{\s*provider: "google"/);
  const currentUserCheck = settings.indexOf("const { data: authData, error: authError } = await supabase.auth.getUser()");
  const linkIdentityCall = settings.indexOf("supabase.auth.linkIdentity({");
  assert.ok(currentUserCheck >= 0 && currentUserCheck < linkIdentityCall);
  assert.match(settings.slice(currentUserCheck, linkIdentityCall), /if \(authError \|\| !authData\.user\)/);
  assert.match(callback, /identityProviders = userData\.user\.identities\?\.map\(\(identity\) => identity\.provider\)/);
  assert.match(callback, /\.eq\("auth_user_id", data\.session\.user\.id\)/);
  assert.match(callback, /isOAuthStudentMappingValid\(/);
});

test("mocked SQL-contract check: student trigger rejects duplicate linked-email profiles", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261022140000_prevent_duplicate_student_email_profiles.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /lower\(btrim\(s\.email\)\) = v_normalized_email/);
  assert.match(migration, /s\.auth_user_id is not null/);
  assert.match(migration, /s\.auth_user_id <> new\.id::text/);
  assert.match(migration, /on conflict \(auth_user_id\) do update/);
  assert.doesNotMatch(migration, /set\s+id\s*=\s*excluded\.id/i);
  assert.match(migration, /errcode = 'P0001'/);
});

test("mocked SQL-contract check: student trigger creates a new identity profile without linked conflict", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261022140000_prevent_duplicate_student_email_profiles.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /insert into public\.students \(id, auth_user_id, display_name, email\)/);
  assert.match(migration, /'student-' \|\| replace\(substring\(new\.id::text, 1, 12\), '-', ''\)/);
  assert.match(migration, /return new;/);
});

test("mocked SQL-contract check: same-auth-identity retries preserve student id", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261022140000_prevent_duplicate_student_email_profiles.sql", import.meta.url),
    "utf8",
  );
  const schema = readFileSync(
    new URL("../supabase/migrations/20260919000000_initial_schema.sql", import.meta.url),
    "utf8",
  );
  const upsert = migration.match(/on conflict \(auth_user_id\) do update([\s\S]*?)return new;/i)?.[1] ?? "";

  assert.ok(upsert);
  assert.match(schema, /create unique index students_auth_user_id_key on public\.students \(auth_user_id\)/i);
  assert.doesNotMatch(upsert, /\bid\s*=/i);
});

test("mocked SQL-contract check: trigger rejects another Auth identity claiming a linked email", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261022140000_prevent_duplicate_student_email_profiles.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /if exists \([\s\S]*?lower\(btrim\(s\.email\)\) = v_normalized_email[\s\S]*?s\.auth_user_id is not null[\s\S]*?s\.auth_user_id <> new\.id::text[\s\S]*?raise exception/i);
});

test("mocked SQL-contract check: trigger ignores and never attaches an unmapped legacy row", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261022140000_prevent_duplicate_student_email_profiles.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /s\.auth_user_id is not null/);
  assert.doesNotMatch(migration, /update public\.students[\s\S]*?set\s+auth_user_id\s*=/i);
  assert.doesNotMatch(migration, /on conflict\s*\(email\)/i);
});

test("mocked SQL-contract check: profile insert failures are not swallowed", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261022140000_prevent_duplicate_student_email_profiles.sql", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(migration, /exception\s+when\s+unique_violation/i);
  assert.doesNotMatch(migration, /exception\s+when\s+others/i);
});

test("mocked SQL-contract check: trigger serializes duplicate-email checks with transaction lock", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261022140000_prevent_duplicate_student_email_profiles.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /v_normalized_email text := nullif\(lower\(btrim\(new\.email\)\), ''\)/);
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(v_normalized_email, 0\)\)/);
  assert.match(migration, /perform pg_advisory_xact_lock[\s\S]*?if exists/i);
});
