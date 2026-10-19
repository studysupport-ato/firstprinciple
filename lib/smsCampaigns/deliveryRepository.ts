import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import { mapArkeselDeliveryStatus } from "./deliveryWebhook";
import { deriveSmsCampaignStatus } from "./status";
import type { SmsProviderStatus, SmsRecipientStatus } from "./types";

type SmsDeliveryDatabase = {
  public: {
    Tables: {
      sms_campaigns: {
        Row: { [key: string]: unknown; id: string; status: string };
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown; status?: string };
        Relationships: [];
      };
      sms_campaign_recipients: {
        Row: { [key: string]: unknown; id: string; campaign_id: string; provider_reference: string | null; status: SmsRecipientStatus; delivery_updated_at: string | null };
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown; status?: SmsRecipientStatus; provider_status?: SmsProviderStatus; delivery_updated_at?: string };
        Relationships: [];
      };
      sms_delivery_events: {
        Row: { [key: string]: unknown; id: string; callback_id: string; recipient_id: string | null; provider_reference: string; provider_status: SmsProviderStatus; provider_timestamp: string; received_at: string };
        Insert: { [key: string]: unknown; callback_id: string; recipient_id?: string | null; provider_reference: string; provider_status: SmsProviderStatus; provider_timestamp: string };
        Update: { [key: string]: unknown; recipient_id?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

function createSmsDeliveryClient(): SupabaseClient<SmsDeliveryDatabase> {
  return createSupabaseAdminClient() as unknown as SupabaseClient<SmsDeliveryDatabase>;
}

export async function applySmsDeliveryEvent(input: {
  callbackId: string;
  smsId: string;
  providerStatus: SmsProviderStatus;
  timestamp: number;
}): Promise<"applied" | "duplicate" | "ignored"> {
  const client = createSmsDeliveryClient();
  const { data: recipient, error } = await client
    .from("sms_campaign_recipients")
    .select("id,provider_reference,status,delivery_updated_at")
    .eq("provider_reference", input.smsId)
    .maybeSingle();
  if (error) return "ignored";
  const { error: eventError } = await client.from("sms_delivery_events").insert({
    callback_id: input.callbackId,
    recipient_id: recipient?.id ?? null,
    provider_reference: input.smsId,
    provider_status: input.providerStatus,
    provider_timestamp: new Date(input.timestamp * 1000).toISOString(),
  });
  if (eventError?.code === "23505") {
    if (recipient && !await applyDeliveryStatus(client, recipient, input.providerStatus, input.timestamp)) return "ignored";
    return "duplicate";
  }
  if (eventError) return "ignored";
  if (!recipient) return "applied";
  return await applyDeliveryStatus(client, recipient, input.providerStatus, input.timestamp) ? "applied" : "ignored";
}

async function applyDeliveryStatus(
  client: SupabaseClient<SmsDeliveryDatabase>,
  recipient: { id: string; status: SmsRecipientStatus; delivery_updated_at: string | null },
  providerStatus: SmsProviderStatus,
  timestamp: number,
): Promise<boolean> {
  const eventMs = timestamp * 1000;
  const eventTime = new Date(eventMs).toISOString();
  if (recipient.delivery_updated_at && new Date(recipient.delivery_updated_at).getTime() >= eventMs) return true;

  const nextStatus = mapArkeselDeliveryStatus(providerStatus);
  const terminal = recipient.status === "delivered" || recipient.status === "failed";
  const status = recipient.status === "delivered" ||
    (recipient.status === "failed" && nextStatus !== "delivered")
    ? recipient.status
    : nextStatus;
  if (!terminal || nextStatus === "delivered") {
    const { error } = await client.from("sms_campaign_recipients").update({
      status,
      provider_status: providerStatus,
      delivery_updated_at: eventTime,
    }).eq("id", recipient.id);
    if (error) return false;
  }

  const { data: row, error: rowError } = await client
    .from("sms_campaign_recipients")
    .select("campaign_id")
    .eq("id", recipient.id)
    .maybeSingle();
  if (rowError || !row) return false;
  const { data: recipients, error: recipientsError } = await client
    .from("sms_campaign_recipients")
    .select("status")
    .eq("campaign_id", row.campaign_id);
  if (recipientsError || !recipients) return false;
  const campaignStatus = deriveSmsCampaignStatus(recipients.map(({ status }) => status));
  const { error: campaignError } = await client
    .from("sms_campaigns")
    .update({ status: campaignStatus })
    .eq("id", row.campaign_id);
  return !campaignError;
}

export async function applyWaitingDeliveryEvents(recipientId: string, providerReference: string): Promise<void> {
  const client = createSmsDeliveryClient();
  const { data: waiting, error: waitError } = await client
    .from("sms_delivery_events")
    .select("id,provider_status,provider_timestamp")
    .eq("provider_reference", providerReference)
    .is("recipient_id", null)
    .order("provider_timestamp", { ascending: true });
  if (waitError) throw waitError;
  for (const event of waiting ?? []) {
    const { data: recipient, error: recipientError } = await client
      .from("sms_campaign_recipients")
      .select("id,status,delivery_updated_at")
      .eq("id", recipientId)
      .maybeSingle();
    if (recipientError) throw recipientError;
    if (!recipient) return;
    const applied = await applyDeliveryStatus(
      client,
      recipient,
      event.provider_status,
      Math.floor(new Date(event.provider_timestamp).getTime() / 1000),
    );
    if (!applied) throw new Error("Stored delivery event could not be applied.");
    const { error } = await client
      .from("sms_delivery_events")
      .update({ recipient_id: recipientId })
      .eq("id", event.id);
    if (error) throw error;
  }
}
