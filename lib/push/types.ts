export type PushSubscriptionStatus = "active" | "revoked" | "expired";

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface ClientPushSubscriptionPayload {
  endpoint: string;
  keys: PushSubscriptionKeys;
  userAgent?: string | null;
}

export interface StudentPushSubscriptionRecord {
  id: string;
  studentId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  status: PushSubscriptionStatus;
  failedAttempts: number;
  lastNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export interface PublicPushConfig {
  publicKey: string | null;
  configured: boolean;
}
