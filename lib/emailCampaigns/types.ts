export type EmailCampaignStatus =
  | "queued"
  | "sending"
  | "provider_accepted"
  | "partial"
  | "failed"
  | "uncertain";

export type EmailRecipientStatus =
  | "queued"
  | "submitting"
  | "provider_accepted"
  | "failed"
  | "uncertain";

export type CampaignRecipient = {
  id: string;
  student_id: string | null;
  recipient_name: string | null;
  recipient_email: string;
  status: EmailRecipientStatus;
  provider_message_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailCampaign = {
  id: string;
  sender_id: string;
  subject: string;
  message: string;
  status: EmailCampaignStatus;
  created_at: string;
  updated_at: string;
  recipients: CampaignRecipient[];
};

export type EmailActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; campaignId?: string; uncertain?: boolean };

export type EmailPublicConfiguration = {
  logoUrl: string | null;
  platformUrl: string | null;
  logoReady: boolean;
  senderReady: boolean;
  providerReady: boolean;
  missing: string[];
};
