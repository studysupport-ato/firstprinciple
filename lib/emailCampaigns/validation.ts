export const EMAIL_SUBJECT_MAX_LENGTH = 160;
export const EMAIL_MESSAGE_MAX_LENGTH = 10_000;
export const EMAIL_CAMPAIGN_MAX_RECIPIENTS = 5000;
export const EMAIL_CAMPAIGN_MAX_MANUAL_RECIPIENTS = 100;

export type EmailCampaignContent = { subject: string; message: string };
export type EmailContentValidation =
  | { ok: true; data: EmailCampaignContent }
  | { ok: false; error: string };

export function validateEmailCampaignContent(input: unknown): EmailContentValidation {
  if (!input || typeof input !== "object") return { ok: false, error: "Enter a subject and message." };
  const record = input as Record<string, unknown>;
  if (typeof record.subject !== "string" || typeof record.message !== "string") {
    return { ok: false, error: "Enter a subject and message." };
  }
  const subject = record.subject.trim();
  const message = record.message.trim();
  if (!subject || !message) return { ok: false, error: "Subject and message cannot be empty." };
  if (/[\r\n]/.test(subject) || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(message)) {
    return { ok: false, error: "Subject or message contains unsupported control characters." };
  }
  if (subject.length > EMAIL_SUBJECT_MAX_LENGTH) {
    return { ok: false, error: `Subject must be ${EMAIL_SUBJECT_MAX_LENGTH} characters or fewer.` };
  }
  if (message.length > EMAIL_MESSAGE_MAX_LENGTH) {
    return { ok: false, error: `Message must be ${EMAIL_MESSAGE_MAX_LENGTH} characters or fewer.` };
  }
  return { ok: true, data: { subject, message } };
}

export function normalizeRecipientIds(input: unknown): { ok: true; ids: string[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) return { ok: false, error: "Select at least one recipient." };
  if (input.length > EMAIL_CAMPAIGN_MAX_RECIPIENTS ||
      input.some((item) => typeof item !== "string" || !item.trim() || item.trim().length > 200)) {
    return { ok: false, error: `Select between 1 and ${EMAIL_CAMPAIGN_MAX_RECIPIENTS} valid recipients.` };
  }
  const ids = [...new Set((input as string[]).map((id) => id.trim()))];
  if (ids.length === 0) return { ok: false, error: "Select at least one recipient." };
  if (ids.length > EMAIL_CAMPAIGN_MAX_RECIPIENTS) {
    return { ok: false, error: `A campaign can include at most ${EMAIL_CAMPAIGN_MAX_RECIPIENTS} recipients.` };
  }
  return { ok: true, ids };
}

export function isValidEmailAddress(value: string): boolean {
  return value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

export function normalizeManualEmailRecipients(input: unknown): { ok: true; emails: string[] } | { ok: false; error: string } {
  if (input === undefined) return { ok: true, emails: [] };
  if (!Array.isArray(input) || input.length > EMAIL_CAMPAIGN_MAX_MANUAL_RECIPIENTS ||
      input.some((item) => typeof item !== "string" || item.trim().length > 254 || !isValidEmailAddress(item.trim()))) {
    return {
      ok: false,
      error: `Enter up to ${EMAIL_CAMPAIGN_MAX_MANUAL_RECIPIENTS} valid email addresses.`,
    };
  }
  return { ok: true, emails: [...new Set((input as string[]).map((email) => email.trim().toLowerCase()))] };
}
