import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  createPasswordRecoveryUrl,
  renderPasswordRecoveryEmail,
} from "../lib/auth/passwordRecoveryEmail";

test("recovery links target the configured site and encode Supabase tokens safely", () => {
  const url = new URL(createPasswordRecoveryUrl("https://www.example.com/", "token&value"));
  assert.equal(url.origin, "https://www.example.com");
  assert.equal(url.pathname, "/auth/confirm");
  assert.equal(url.searchParams.get("token_hash"), "token&value");
  assert.equal(url.searchParams.get("type"), "recovery");
});

test("recovery email escapes links and rejects non-HTTPS logo URLs", () => {
  const html = renderPasswordRecoveryEmail({
    recoveryUrl: "https://www.example.com/auth/confirm?token_hash=a%26b&type=recovery",
    logoUrl: "javascript:alert(1)",
  });
  assert.match(html, /href="https:\/\/www\.example\.com\/auth\/confirm\?token_hash=a%26b&amp;type=recovery"/);
  assert.doesNotMatch(html, /javascript:/);
  assert.match(html, /First Principles · Math 151/);
});

test("recovery rate-limit migration protects request records and service-only RPC", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261019120000_add_password_recovery_rate_limit.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /force row level security/i);
  assert.match(migration, /v_email_count >= 3 or v_ip_count >= 10/i);
  assert.match(migration, /revoke all on function public\.consume_password_recovery_rate_limit\(text, text\)\s+from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.consume_password_recovery_rate_limit\(text, text\)\s+to service_role/i);
});
