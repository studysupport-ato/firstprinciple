import type { EmailCampaignStatus, EmailRecipientStatus } from "./types";

export function deriveCampaignStatus(
  results: Array<"provider_accepted" | "failed" | "uncertain">,
): EmailCampaignStatus {
  if (results.includes("uncertain")) return "uncertain";
  const accepted = results.filter((status) => status === "provider_accepted").length;
  const failed = results.filter((status) => status === "failed").length;
  if (accepted && failed) return "partial";
  return accepted ? "provider_accepted" : "failed";
}

export function canRetryFailedRecipient(status: EmailRecipientStatus): boolean {
  return status === "failed";
}
