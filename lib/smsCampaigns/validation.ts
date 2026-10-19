export const SMS_MESSAGE_MAX_LENGTH = 1000;
export const SMS_CAMPAIGN_MAX_RECIPIENTS = 5000;
export const SMS_CAMPAIGN_HISTORY_LIMIT = 10;
export const ARKESEL_SMS_BATCH_SIZE = 100;

export type SmsContentValidation =
  | { ok: true; message: string }
  | { ok: false; error: string };

export function validateSmsMessage(input: unknown): SmsContentValidation {
  if (typeof input !== "string") return { ok: false, error: "Enter an SMS message." };
  const message = input.trim();
  if (!message) return { ok: false, error: "Message cannot be empty." };
  if (message.length > SMS_MESSAGE_MAX_LENGTH) return { ok: false, error: `Message must be ${SMS_MESSAGE_MAX_LENGTH} characters or fewer.` };
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(message)) return { ok: false, error: "Message contains unsupported control characters." };
  return { ok: true, message };
}

export function isSmsCampaignFormReady(input: {
  sending: boolean;
  audience: "all" | "custom" | null;
  selectedStudentCount: number;
  manualNumberCount: number;
  message: string;
  purposeConfirmed: boolean;
  manualConsentConfirmed: boolean;
  manualConsentReference: string;
}): boolean {
  const hasRecipients = input.audience === "all" || input.selectedStudentCount > 0 || input.manualNumberCount > 0;
  const manualConsentReady = input.manualNumberCount === 0 ||
    (input.manualConsentConfirmed && Boolean(input.manualConsentReference.trim()));
  return !input.sending &&
    hasRecipients &&
    Boolean(input.message.trim()) &&
    input.purposeConfirmed &&
    manualConsentReady;
}

export function normalizeSmsRecipientIds(input: unknown): { ok: true; ids: string[] } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: "Select at least one recipient." };
  if (input.length > SMS_CAMPAIGN_MAX_RECIPIENTS ||
      input.some((value) => typeof value !== "string" || !value.trim() || value.trim().length > 200)) {
    return { ok: false, error: `Select between 1 and ${SMS_CAMPAIGN_MAX_RECIPIENTS} valid recipients.` };
  }
  return { ok: true, ids: [...new Set((input as string[]).map((id) => id.trim()))] };
}

export function normalizeSmsCampaignIds(input: unknown): { ok: true; ids: string[] } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0 || input.length > SMS_CAMPAIGN_HISTORY_LIMIT) {
    return { ok: false, error: `Select between 1 and ${SMS_CAMPAIGN_HISTORY_LIMIT} campaigns.` };
  }
  if (input.some((value) => typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim()))) {
    return { ok: false, error: "The campaign selection is invalid." };
  }
  return { ok: true, ids: [...new Set((input as string[]).map((id) => id.trim()))] };
}

export function validateManualSmsNumbers(input: unknown): { ok: true; numbers: string[] } | { ok: false; error: string } {
  if (input === undefined) return { ok: true, numbers: [] };
  if (!Array.isArray(input) || input.length > 100 ||
      input.some((value) => typeof value !== "string" || value.trim().length > 30)) {
    return { ok: false, error: "Enter up to 100 valid international phone numbers." };
  }
  const numbers = (input as string[]).map((value) => value.trim());
  if (numbers.some((value) => !/^\+[1-9]\d{7,14}$/.test(value))) {
    return { ok: false, error: "Use international format with a leading + and country code, such as +233208535111." };
  }
  return { ok: true, numbers: [...new Set(numbers)] };
}
