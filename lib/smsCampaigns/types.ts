export type SmsConsentStatus = "unknown" | "opted_in" | "opted_out";
export type SmsCampaignStatus = "queued" | "sending" | "provider_accepted" | "partial" | "failed" | "uncertain";
export type SmsRecipientStatus = "queued" | "submitting" | "provider_accepted" | "delivered" | "failed" | "uncertain" | "suppressed";
export type SmsProviderStatus = "DELIVERED" | "SUBMITTED" | "PROHIBITED" | "QUEUED" | "NOT_DELIVERED" | "EXPIRED";

export type SmsCampaignRecipient = {
  id: string;
  student_id: string | null;
  recipient_name: string | null;
  recipient_phone: string;
  consent_source_snapshot: string;
  consent_reference_snapshot: string | null;
  status: SmsRecipientStatus;
  attempt_count: number;
  provider_reference: string | null;
  provider_status: SmsProviderStatus | null;
  error_message: string | null;
  delivery_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SmsCampaign = {
  id: string;
  sender_id: string;
  message: string;
  purpose: "educational" | "operational";
  sender_name: string;
  status: SmsCampaignStatus;
  created_at: string;
  updated_at: string;
  recipients: SmsCampaignRecipient[];
};

export type SmsActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; campaignId?: string; uncertain?: boolean };

export type SmsAdminStudent = {
  studentId: string;
  fullName: string;
  phoneNumber: string | null;
  phoneStatus: "eligible" | "missing" | "invalid" | "ambiguous" | "duplicate";
  smsConsentStatus: SmsConsentStatus;
  consentSource: string | null;
  consentReference: string | null;
  consentRecordedAt: string | null;
};

export type SmsAdminDirectoryPage = {
  students: SmsAdminStudent[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type SmsPublicConfiguration = {
  senderName: string;
  senderReady: boolean;
  apiReady: boolean;
  callbackReady: boolean;
  webhookReady: boolean;
  missing: string[];
};
