import { escapeEmailHtml, normalizePublicHttpsUrl } from "@/lib/emailCampaigns/template";

export function createPasswordRecoveryUrl(platformUrl: string, tokenHash: string): string {
  const baseUrl = normalizePublicHttpsUrl(platformUrl);
  if (!baseUrl || !tokenHash.trim()) {
    throw new Error("A valid public site URL and recovery token are required.");
  }

  const callback = new URL("/auth/confirm", baseUrl);
  callback.searchParams.set("token_hash", tokenHash);
  callback.searchParams.set("type", "recovery");
  return callback.toString();
}

export function renderPasswordRecoveryEmail(input: {
  recoveryUrl: string;
  logoUrl: string | null;
}): string {
  const recoveryUrl = escapeEmailHtml(input.recoveryUrl);
  const logoUrl = input.logoUrl ? normalizePublicHttpsUrl(input.logoUrl) : null;
  const logo = logoUrl
    ? `<img src="${escapeEmailHtml(logoUrl)}" width="198" alt="First Principles · Math 151" style="display:block;width:198px;height:auto;max-width:100%;border:0">`
    : `<p style="margin:0;color:#111111;font-size:20px;font-weight:700">First Principles · Math 151</p>`;

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset your password</title></head>
<body style="margin:0;padding:32px 12px;background:#FFFBF5;font-family:Arial,Helvetica,sans-serif;color:#111111">
  <main style="max-width:540px;margin:0 auto">
    <div style="padding:0 8px 20px">${logo}</div>
    <section style="padding:32px;background:#FFFFFF;border:1px solid #E5E5E5;border-top:4px solid #FFBE00;border-radius:14px">
      <p style="margin:0 0 8px;color:#666666;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Account security</p>
      <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">Reset your password</h1>
      <p style="margin:0 0 24px;color:#444444;font-size:16px;line-height:1.65">We received a request to reset your First Principles account password. Use the button below to choose a new password. If you did not request this, you can ignore this email.</p>
      <p style="margin:0 0 22px"><a href="${recoveryUrl}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#111111;color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none">Choose a new password</a></p>
      <p style="margin:0;color:#666666;font-size:12px;line-height:1.6">For your security, this link can only be used once and expires. If the button does not work, copy and paste this URL into your browser:<br><a href="${recoveryUrl}" style="color:#111111;overflow-wrap:anywhere">${recoveryUrl}</a></p>
    </section>
    <p style="margin:18px 8px 0;color:#666666;font-size:12px">First Principles · Math 151</p>
  </main>
</body>
</html>`;
}
