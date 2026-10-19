import assert from "node:assert/strict";
import test from "node:test";

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
