export const FIRST_PRINCIPLES_EMAIL_BRAND = "First Principles · Math 151";

export type BrandedEmailInput = {
  subject: string;
  message: string;
  logoUrl?: string | null;
  platformUrl?: string | null;
};

export function normalizePublicHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function messageToEmailHtml(message: string): string {
  return message
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p style="margin:0 0 18px;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;white-space:normal">${escapeEmailHtml(paragraph).replace(/\r?\n/g, "<br>")}</p>`)
    .join("");
}

export function renderBrandedEmail(input: BrandedEmailInput): string {
  const subject = escapeEmailHtml(input.subject);
  const logoUrl = normalizePublicHttpsUrl(input.logoUrl);
  const platformUrl = normalizePublicHttpsUrl(input.platformUrl);
  const logo = logoUrl
    ? `<img src="${escapeEmailHtml(logoUrl)}" width="198" height="63" alt="First Principles · Math 151" style="display:block;width:198px;height:auto;max-width:100%;border:0;outline:none;text-decoration:none">`
    : `<div role="img" aria-label="First Principles · Math 151" style="color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;line-height:1.3">First Principles <span style="color:#666666;font-weight:400">· Math 151</span></div>`;
  const platformLink = platformUrl
    ? `<p style="margin:0 0 20px"><a href="${escapeEmailHtml(platformUrl)}" style="color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:underline;text-decoration-color:#FFBE00;text-underline-offset:4px">Visit First Principles</a></p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#FFFBF5">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${subject}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;background-color:#FFFBF5">
    <tr><td align="center" style="padding:34px 14px">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0">
        <tr><td style="padding:0 10px 22px">${logo}</td></tr>
        <tr><td style="padding:34px 34px 30px;background:#FFFFFF;border:1px solid #E5E5E5;border-top:4px solid #FFBE00;border-radius:14px">
          <p style="margin:0 0 9px;color:#666666;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase">A message from your learning team</p>
          <h1 style="margin:0 0 22px;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;line-height:1.25">${subject}</h1>
          ${messageToEmailHtml(input.message)}
          ${platformLink}
        </td></tr>
        <tr><td style="padding:22px 10px 0;color:#666666;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6">
          <p style="margin:0 0 5px;font-weight:700;color:#111111">First Principles · Math 151</p>
          <p style="margin:0">A clearer way to learn mathematics.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
