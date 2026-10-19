import { createHmac, timingSafeEqual } from "node:crypto";
import type { SmsProviderStatus } from "./types";

export const ARKESEL_DELIVERY_STATUSES = [
  "DELIVERED",
  "SUBMITTED",
  "PROHIBITED",
  "QUEUED",
  "NOT_DELIVERED",
  "EXPIRED",
] as const;

export type ArkeselDeliveryEvent = {
  smsId: string;
  status: SmsProviderStatus;
  callbackId: string;
  timestamp: number;
};

function canonicalQuery(query: URLSearchParams): string | null {
  const pairs = [...query.entries()].sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  const params: Record<string, string> = {};
  for (const [key, value] of pairs) {
    if (Object.prototype.hasOwnProperty.call(params, key)) return null;
    params[key] = value;
  }
  return JSON.stringify(params);
}

export function verifyArkeselDeliverySignature(input: {
  query: URLSearchParams;
  timestampHeader: string | null;
  signatureHeader: string | null;
  callbackIdHeader: string | null;
  secrets: string[];
  nowSeconds?: number;
}): ArkeselDeliveryEvent | null {
  const timestamp = Number(input.timestampHeader);
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isInteger(timestamp) || Math.abs(nowSeconds - timestamp) > 300) return null;
  if (!input.callbackIdHeader || input.callbackIdHeader.length > 200) return null;
  const signatures = input.signatureHeader
    ?.split(",")
    .map((part) => part.trim().match(/^v1=([a-f0-9]{64})$/i)?.[1])
    .filter((part): part is string => Boolean(part));
  if (!signatures?.length || !input.secrets.length) return null;
  const smsId = input.query.get("sms_id");
  const rawStatus = input.query.get("status");
  if (!smsId || smsId.length > 300 || !rawStatus ||
      !ARKESEL_DELIVERY_STATUSES.includes(rawStatus as SmsProviderStatus)) return null;

  const canonical = canonicalQuery(input.query);
  if (!canonical) return null;
  const payload = `${timestamp}.${canonical}`;
  const valid = input.secrets.some((secret) => {
    const expected = createHmac("sha256", secret).update(payload).digest();
    return signatures.some((signature) => {
      const signatureBytes = Buffer.from(signature, "hex");
      return expected.length === signatureBytes.length && timingSafeEqual(expected, signatureBytes);
    });
  });
  if (!valid) return null;
  return {
    smsId,
    status: rawStatus as SmsProviderStatus,
    callbackId: input.callbackIdHeader,
    timestamp,
  };
}

export function mapArkeselDeliveryStatus(status: SmsProviderStatus): "delivered" | "provider_accepted" | "queued" | "failed" {
  if (status === "DELIVERED") return "delivered";
  if (status === "SUBMITTED") return "provider_accepted";
  if (status === "QUEUED") return "provider_accepted";
  return "failed";
}
