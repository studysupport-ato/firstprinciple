import { isValidEmailAddress } from "./validation";

export type TrustedStudentRecipient = {
  id: string;
  display_name: string | null;
  email: string | null;
};

export type ResolvedCampaignRecipient = {
  student_id: string | null;
  recipient_name: string | null;
  recipient_email: string;
};

export type RecipientResolution =
  | { ok: true; recipients: ResolvedCampaignRecipient[] }
  | { ok: false; error: string };

export function resolveCampaignRecipients(
  requestedIds: string[],
  students: TrustedStudentRecipient[] | null,
): RecipientResolution {
  if (!students || students.length !== requestedIds.length) {
    return { ok: false, error: "One or more selected students could not be verified. Refresh the directory and select recipients again." };
  }
  const invalidCount = students.filter((student) => !student.email || !isValidEmailAddress(student.email)).length;
  if (invalidCount) {
    return {
      ok: false,
      error: `${invalidCount} selected student${invalidCount === 1 ? "" : "s"} have no valid email address. Remove them before sending.`,
    };
  }
  return {
    ok: true,
    recipients: students.map((student) => ({
      student_id: student.id,
      recipient_name: student.display_name,
      recipient_email: student.email!,
    })),
  };
}

export function mergeManualEmailRecipients(
  recipients: ResolvedCampaignRecipient[],
  manualEmails: string[],
): ResolvedCampaignRecipient[] {
  const seen = new Set(recipients.map(({ recipient_email }) => recipient_email.trim().toLowerCase()));
  const merged = [...recipients];
  for (const email of manualEmails) {
    const normalized = email.trim().toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push({ student_id: null, recipient_name: null, recipient_email: normalized });
  }
  return merged;
}
