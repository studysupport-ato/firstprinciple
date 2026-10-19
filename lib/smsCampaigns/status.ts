import type { SmsCampaignStatus, SmsRecipientStatus } from "./types";

export function deriveSmsCampaignStatus(statuses: SmsRecipientStatus[]): SmsCampaignStatus {
  if (statuses.includes("uncertain") || statuses.includes("submitting")) return "uncertain";
  const accepted = statuses.some((status) => status === "provider_accepted" || status === "delivered");
  const failed = statuses.includes("failed");
  if (accepted && failed) return "partial";
  return accepted ? "provider_accepted" : "failed";
}

export function canRetrySmsRecipient(status: SmsRecipientStatus, attemptCount: number): boolean {
  return status === "failed" && attemptCount >= 0 && attemptCount < 5;
}
