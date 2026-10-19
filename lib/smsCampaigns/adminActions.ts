"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AdminUnauthorizedError, requireAdmin } from "@/lib/adminSession";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import { getArkeselConfiguration, getSmsPublicConfiguration, isValidArkeselSender } from "./config";
import { normalizeGhanaSmsNumber, normalizeSmsRecipientNumber, resolveSmsRecipients } from "./phone";
import { submitArkeselSmsBatch } from "./arkeselProvider";
import { deriveSmsCampaignStatus } from "./status";
import { applyWaitingDeliveryEvents } from "./deliveryRepository";
import { ARKESEL_SMS_BATCH_SIZE, SMS_CAMPAIGN_MAX_RECIPIENTS, normalizeSmsCampaignIds, normalizeSmsRecipientIds, validateManualSmsNumbers, validateSmsMessage } from "./validation";
import { isEmailAdminAuthorized } from "@/lib/emailCampaigns/authorization";
import type {
  SmsActionResult,
  SmsAdminDirectoryPage,
  SmsAdminStudent,
  SmsCampaign,
  SmsCampaignStatus,
  SmsConsentStatus,
} from "./types";

type SmsDatabase = {
  public: {
    Tables: {
      sms_campaigns: {
        Row: { [key: string]: unknown; id: string; idempotency_key: string; sender_id: string; sender_name: string; message: string; purpose: "educational" | "operational"; status: SmsCampaignStatus; created_at: string; updated_at: string };
        Insert: { [key: string]: unknown; idempotency_key: string; sender_id: string; sender_name: string; message: string; purpose: "educational" | "operational"; status?: SmsCampaignStatus };
        Update: Partial<SmsDatabase["public"]["Tables"]["sms_campaigns"]["Insert"]>;
        Relationships: [];
      };
      sms_campaign_recipients: {
        Row: { [key: string]: unknown; id: string; campaign_id: string; student_id: string | null; recipient_name: string | null; recipient_phone: string; status: "queued" | "submitting" | "provider_accepted" | "delivered" | "failed" | "uncertain" | "suppressed"; provider_reference: string | null; provider_status: string | null; attempt_count: number; consent_status_snapshot: "opted_in"; consent_source_snapshot: string; consent_reference_snapshot: string | null; consent_recorded_at_snapshot: string; error_message: string | null; delivery_updated_at: string | null; created_at: string; updated_at: string };
        Insert: { [key: string]: unknown; campaign_id: string; student_id?: string | null; recipient_name?: string | null; recipient_phone: string; consent_status_snapshot: "opted_in"; consent_source_snapshot: string; consent_reference_snapshot?: string | null; consent_recorded_at_snapshot: string; status?: "queued" | "submitting" | "provider_accepted" | "delivered" | "failed" | "uncertain" | "suppressed"; provider_reference?: string | null; provider_status?: string | null; attempt_count?: number; error_message?: string | null; delivery_updated_at?: string | null };
        Update: Partial<SmsDatabase["public"]["Tables"]["sms_campaign_recipients"]["Insert"]>;
        Relationships: [];
      };
      student_sms_preferences: {
        Row: { [key: string]: unknown; student_id: string; status: SmsConsentStatus; consent_source: string | null; consent_reference: string | null; consent_recorded_at: string | null; consent_recorded_by: string | null; opted_out_at: string | null; opted_out_reference: string | null; updated_at: string };
        Insert: { [key: string]: unknown; student_id: string; status?: SmsConsentStatus; consent_source?: string | null; consent_reference?: string | null; consent_recorded_at?: string | null; consent_recorded_by?: string | null; opted_out_at?: string | null; opted_out_reference?: string | null };
        Update: Partial<SmsDatabase["public"]["Tables"]["student_sms_preferences"]["Insert"]>;
        Relationships: [];
      };
      sms_delivery_events: {
        Row: { [key: string]: unknown; id: string; callback_id: string; recipient_id: string | null; provider_reference: string; provider_status: string; provider_timestamp: string; received_at: string };
        Insert: { [key: string]: unknown; callback_id: string; recipient_id?: string | null; provider_reference: string; provider_status: string; provider_timestamp: string };
        Update: Partial<SmsDatabase["public"]["Tables"]["sms_delivery_events"]["Insert"]>;
        Relationships: [];
      };
      students: {
        Row: { [key: string]: unknown; id: string; display_name: string; phone_number: string | null };
        Insert: { [key: string]: unknown; id: string; display_name: string; phone_number?: string | null };
        Update: Partial<SmsDatabase["public"]["Tables"]["students"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      delete_sms_campaigns_admin: {
        Args: { p_campaign_ids: string[] };
        Returns: number;
      };
    };
  };
};

function createSmsAdminClient(): SupabaseClient<SmsDatabase> {
  return createSupabaseAdminClient() as unknown as SupabaseClient<SmsDatabase>;
}

async function authorized(): Promise<boolean> {
  return isEmailAdminAuthorized(
    requireAdmin,
    (error) => error instanceof AdminUnauthorizedError,
    () => console.error("[sms campaigns] Admin session validation failed."),
  );
}

function validRequestKey(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function statusFromRecipients(statuses: string[]): SmsCampaignStatus {
  return deriveSmsCampaignStatus(statuses as SmsCampaign["recipients"][number]["status"][]);
}

async function countsForCampaign(client: SupabaseClient<SmsDatabase>, campaignId: string) {
  const { data, error } = await client
    .from("sms_campaign_recipients")
    .select("status")
    .eq("campaign_id", campaignId);
  if (error || !data) return null;
  return {
    accepted: data.filter((item) => item.status === "provider_accepted" || item.status === "delivered").length,
    delivered: data.filter((item) => item.status === "delivered").length,
    failed: data.filter((item) => item.status === "failed").length,
    uncertain: data.filter((item) => item.status === "uncertain" || item.status === "submitting").length,
    suppressed: data.filter((item) => item.status === "suppressed").length,
  };
}

export async function getSmsCampaignConfigurationAction(): Promise<SmsActionResult<ReturnType<typeof getSmsPublicConfiguration>>> {
  if (!await authorized()) return { ok: false, error: "Unauthorized. A valid admin session is required." };
  return { ok: true, data: getSmsPublicConfiguration() };
}

export async function getSmsStudentPreferencesAction(studentIds: unknown): Promise<
  SmsActionResult<Array<{ studentId: string; status: SmsConsentStatus; consentSource: string | null; consentReference: string | null; consentRecordedAt: string | null }>>
> {
  if (!await authorized()) return { ok: false, error: "Unauthorized. A valid admin session is required." };
  const normalized = normalizeSmsRecipientIds(studentIds);
  if (!normalized.ok) return normalized;
  const { data, error } = await createSmsAdminClient()
    .from("student_sms_preferences")
    .select("student_id,status,consent_source,consent_reference,consent_recorded_at")
    .in("student_id", normalized.ids);
  if (error) {
    console.error("[sms campaigns] Could not load SMS preferences.");
    return { ok: false, error: "SMS consent and suppression status could not be loaded." };
  }
  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      studentId: row.student_id,
      status: row.status,
      consentSource: row.consent_source,
      consentReference: row.consent_reference,
      consentRecordedAt: row.consent_recorded_at,
    })),
  };
}

export async function recordSmsConsentAction(input: unknown): Promise<SmsActionResult<{ studentId: string; status: SmsConsentStatus }>> {
  if (!await authorized()) return { ok: false, error: "Unauthorized. A valid admin session is required." };
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid SMS consent request." };
  const record = input as Record<string, unknown>;
  if (typeof record.studentId !== "string" || !record.studentId.trim()) return { ok: false, error: "A student is required." };
  if (record.status !== "opted_in" && record.status !== "opted_out") return { ok: false, error: "Choose an opt-in or opt-out record." };
  if (typeof record.reference !== "string" || !record.reference.trim() || record.reference.trim().length > 500) {
    return { ok: false, error: "Record where the consent or opt-out evidence is stored (up to 500 characters)." };
  }
  const source = record.source;
  const validSources = ["student_form", "written_request", "verbal_record", "imported"];
  if (!validSources.includes(String(source))) return { ok: false, error: "Choose a valid consent evidence source." };

  const client = createSmsAdminClient();
  const { data: student, error: studentError } = await client
    .from("students")
    .select("id")
    .eq("id", record.studentId.trim())
    .maybeSingle();
  if (studentError || !student) return { ok: false, error: "The selected student could not be verified." };
  const now = new Date().toISOString();
  const status = record.status;
  const { error } = await client
    .from("student_sms_preferences")
    .upsert({
      student_id: student.id,
      status,
      consent_source: source as "student_form" | "written_request" | "verbal_record" | "imported",
      consent_reference: record.reference.trim(),
      consent_recorded_at: now,
      consent_recorded_by: "admin",
      opted_out_at: status === "opted_out" ? now : null,
      opted_out_reference: status === "opted_out" ? record.reference.trim() : null,
    });
  if (error) {
    console.error("[sms campaigns] Could not save student SMS preference.");
    return { ok: false, error: "The consent or suppression record could not be saved." };
  }
  revalidatePath("/admin/sms");
  return { ok: true, data: { studentId: student.id, status } };
}

export async function sendSmsCampaignAction(input: unknown): Promise<SmsActionResult<{
  campaignId: string;
  status: SmsCampaignStatus;
  replayed: boolean;
  accepted: number;
  delivered: number;
  failed: number;
  uncertain: number;
  suppressed: number;
  excluded: Array<{ studentId: string; reason: string }>;
}>> {
  if (!await authorized()) return { ok: false, error: "Unauthorized. A valid admin session is required." };
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid SMS campaign request." };
  const record = input as Record<string, unknown>;
  const message = validateSmsMessage(record.message);
  if (!message.ok) return message;
  if (record.purpose !== "educational" && record.purpose !== "operational") {
    return { ok: false, error: "Choose an educational or operational SMS purpose." };
  }
  if (record.purposeConfirmed !== true) {
    return { ok: false, error: "Confirm this is a non-promotional educational or operational message." };
  }
  const audience = record.audience === "all" ? "all" : "custom";
  const manualNumbersResult = validateManualSmsNumbers(record.manualNumbers);
  if (!manualNumbersResult.ok) return manualNumbersResult;
  const manualConsentReference = typeof record.manualConsentReference === "string" ? record.manualConsentReference.trim() : "";
  if (manualNumbersResult.numbers.length &&
      (record.manualConsentConfirmed !== true || !manualConsentReference || manualConsentReference.length > 500)) {
    return { ok: false, error: "Confirm that manually entered recipients consented, and provide a short consent evidence reference." };
  }
  const ids = audience === "custom"
    ? Array.isArray(record.studentIds) && record.studentIds.length
      ? normalizeSmsRecipientIds(record.studentIds)
      : { ok: true as const, ids: [] }
    : { ok: true as const, ids: [] };
  if (!ids.ok) return ids;
  if (audience === "custom" && ids.ids.length === 0 && manualNumbersResult.numbers.length === 0) {
    return { ok: false, error: "Choose all users, select custom students, or enter a phone number." };
  }
  if (!validRequestKey(record.idempotencyKey)) return { ok: false, error: "Refresh the page and try again." };

  let providerConfig;
  try {
    providerConfig = getArkeselConfiguration();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "SMS provider configuration is incomplete." };
  }

  const client = createSmsAdminClient();
  const { data: existing, error: existingError } = await client
    .from("sms_campaigns")
    .select("id,status")
    .eq("idempotency_key", record.idempotencyKey)
    .maybeSingle();
  if (existingError) return { ok: false, error: "Campaign status could not be checked; do not start a new send until reviewed." };
  if (existing) {
    const counts = await countsForCampaign(client, existing.id);
    if (!counts) return { ok: false, error: "Existing campaign status could not be loaded.", campaignId: existing.id, uncertain: true };
    return { ok: true, data: { campaignId: existing.id, status: existing.status, replayed: true, ...counts, excluded: [] } };
  }

  const consentSnapshot = new Map<string, { status: SmsConsentStatus; consent_source: string | null; consent_reference: string | null; consent_recorded_at: string | null }>();
  let recipients: Array<{ studentId: string | null; fullName: string; phoneNumber: string }> = [];
  let excluded: Array<{ studentId: string; reason: string }> = [];
  if (audience === "all") {
    const pageSize = 500;
    const seenPhones = new Set<string>();
    for (let offset = 0; ; offset += pageSize) {
      const { data: pageRows, error } = await client
        .from("students")
        .select("id,display_name,phone_number")
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1)
        .abortSignal(AbortSignal.timeout(30_000));
      if (error) return { ok: false, error: "Student SMS recipients could not be loaded. Nothing was sent." };
      const pageIds = (pageRows ?? []).map((student) => student.id);
      const { data: pagePreferences, error: preferencesError } = pageIds.length
        ? await client.from("student_sms_preferences").select("student_id,status,consent_source,consent_reference,consent_recorded_at").in("student_id", pageIds)
        : { data: [], error: null };
      if (preferencesError) return { ok: false, error: "SMS consent and opt-out status could not be verified; nothing was sent." };
      const preferenceById = new Map((pagePreferences ?? []).map((preference) => [preference.student_id, preference]));
      const pageResolution = resolveSmsRecipients((pageRows ?? []).map((student) => {
        const preference = preferenceById.get(student.id);
        return {
          studentId: student.id,
          fullName: student.display_name ?? "",
          phoneNumber: student.phone_number,
          consentStatus: preference?.status ?? "unknown",
        };
      }));
      for (const recipient of pageResolution.recipients) {
        if (seenPhones.has(recipient.phoneNumber)) continue;
        seenPhones.add(recipient.phoneNumber);
        recipients.push(recipient);
        const preference = preferenceById.get(recipient.studentId);
        if (preference) consentSnapshot.set(recipient.studentId, preference);
        if (recipients.length > SMS_CAMPAIGN_MAX_RECIPIENTS) {
          return { ok: false, error: `This audience exceeds the ${SMS_CAMPAIGN_MAX_RECIPIENTS.toLocaleString()} recipient safety limit.` };
        }
      }
      if (excluded.length < 200) excluded.push(...pageResolution.excluded.slice(0, 200 - excluded.length).map(({ studentId, reason }) => ({ studentId, reason })));
      if (!pageRows || pageRows.length < pageSize) break;
    }
  } else {
    if (ids.ids.length) {
      const { data, error } = await client
        .from("students")
        .select("id,display_name,phone_number")
        .in("id", ids.ids)
        .abortSignal(AbortSignal.timeout(15_000));
      if (error) return { ok: false, error: "Selected student records could not be verified." };
      if (!data || data.length !== ids.ids.length) return { ok: false, error: "One or more selected students could not be verified." };
      const { data: preferences, error: preferencesError } = await client
        .from("student_sms_preferences")
        .select("student_id,status,consent_source,consent_reference,consent_recorded_at")
        .in("student_id", ids.ids);
      if (preferencesError) return { ok: false, error: "SMS consent and opt-out status could not be verified; nothing was sent." };
      for (const preference of preferences ?? []) consentSnapshot.set(preference.student_id, preference);
      const resolved = resolveSmsRecipients(data.map((student) => {
        const preference = consentSnapshot.get(student.id);
        return {
          studentId: student.id,
          fullName: student.display_name ?? "",
          phoneNumber: student.phone_number,
          consentStatus: preference?.status ?? "unknown",
        };
      }));
      recipients = resolved.recipients;
      excluded = resolved.excluded.map(({ studentId, reason }) => ({ studentId, reason }));
    }
  }
  const seenRecipientNumbers = new Set(recipients.map(({ phoneNumber }) => phoneNumber));
  for (const inputNumber of manualNumbersResult.numbers) {
    const normalized = normalizeSmsRecipientNumber(inputNumber);
    if (!normalized.ok) return { ok: false, error: `Invalid manually entered phone number: ${inputNumber}` };
    if (!seenRecipientNumbers.has(normalized.e164)) {
      seenRecipientNumbers.add(normalized.e164);
      recipients.push({ studentId: null, fullName: "Manual recipient", phoneNumber: normalized.e164 });
    }
  }
  if (!recipients.length) {
    return { ok: false, error: "No selected students have a valid Ghana mobile number and recorded SMS opt-in consent." };
  }
  if (recipients.length > SMS_CAMPAIGN_MAX_RECIPIENTS) {
    return { ok: false, error: `This audience exceeds the ${SMS_CAMPAIGN_MAX_RECIPIENTS.toLocaleString()} recipient safety limit.` };
  }
  const { data: campaign, error: campaignError } = await client
    .from("sms_campaigns")
    .insert({
      idempotency_key: record.idempotencyKey,
      sender_id: "admin",
      sender_name: providerConfig.sender,
      message: message.message,
      purpose: record.purpose,
      status: "sending",
    })
    .select("id,status")
    .single();
  if (campaignError || !campaign) {
    if (campaignError?.code === "23505") {
      const { data: duplicate } = await client.from("sms_campaigns").select("id,status").eq("idempotency_key", record.idempotencyKey).maybeSingle();
      if (duplicate) {
        const counts = await countsForCampaign(client, duplicate.id);
        if (counts) return { ok: true, data: { campaignId: duplicate.id, status: duplicate.status, replayed: true, ...counts, excluded: [] } };
      }
    }
    return { ok: false, error: "Campaign could not be persisted; no SMS was sent." };
  }

  const insertedRecipients = recipients.map((recipient) => {
    const consent = recipient.studentId ? consentSnapshot.get(recipient.studentId) : undefined;
    return {
      campaign_id: campaign.id,
      student_id: recipient.studentId,
      recipient_name: recipient.fullName,
      recipient_phone: recipient.phoneNumber,
      consent_status_snapshot: "opted_in" as const,
      consent_source_snapshot: recipient.studentId ? consent?.consent_source ?? "unknown" : "admin_attestation",
      consent_reference_snapshot: recipient.studentId ? consent?.consent_reference ?? null : manualConsentReference,
      consent_recorded_at_snapshot: recipient.studentId
        ? consent?.consent_recorded_at ?? new Date(0).toISOString()
        : new Date().toISOString(),
      status: "queued" as const,
    };
  });
  const rows: Array<{
    id: string;
    student_id: string | null;
    recipient_phone: string;
    attempt_count: number;
    consent_status_snapshot: "opted_in";
    consent_source_snapshot: string;
    consent_reference_snapshot: string | null;
  }> = [];
  for (let offset = 0; offset < insertedRecipients.length; offset += 250) {
    const { data, error } = await client
      .from("sms_campaign_recipients")
      .insert(insertedRecipients.slice(offset, offset + 250))
      .select("id,student_id,recipient_phone,attempt_count,consent_status_snapshot,consent_source_snapshot,consent_reference_snapshot");
    if (error || !data) {
      await client.from("sms_campaigns").update({ status: "failed" }).eq("id", campaign.id);
      return { ok: false, error: "Campaign recipients could not be saved; no SMS was sent.", campaignId: campaign.id };
    }
    rows.push(...data);
  }
  return await submitCampaignRows(client, providerConfig, campaign.id, message.message, rows, excluded, "queued");
}

async function submitCampaignRows(
  client: SupabaseClient<SmsDatabase>,
  providerConfig: ReturnType<typeof getArkeselConfiguration>,
  campaignId: string,
  message: string,
  rows: Array<{ id: string; student_id: string | null; recipient_phone: string; attempt_count: number; consent_status_snapshot: "opted_in"; consent_source_snapshot: string; consent_reference_snapshot: string | null }>,
  excluded: Array<{ studentId: string; reason: string }>,
  expectedStatus: "queued" | "failed",
) {
  const studentIds = [...new Set(rows.flatMap((row) => row.student_id ? [row.student_id] : []))];
  const phoneByStudentId = new Map<string, string | null>();
  const consentByStudentId = new Map<string, SmsConsentStatus>();
  for (let offset = 0; offset < studentIds.length; offset += 500) {
    const ids = studentIds.slice(offset, offset + 500);
    const [{ data: currentStudents, error: studentError }, { data: currentPreferences, error: preferenceError }] = await Promise.all([
      client.from("students").select("id,phone_number").in("id", ids),
      client.from("student_sms_preferences").select("student_id,status").in("student_id", ids),
    ]);
    if (studentError || preferenceError) {
      return { ok: false as const, error: "Current phone and consent records could not be verified; no SMS was sent.", campaignId, uncertain: true };
    }
    for (const student of currentStudents ?? []) phoneByStudentId.set(student.id, student.phone_number);
    for (const preference of currentPreferences ?? []) consentByStudentId.set(preference.student_id, preference.status);
  }
  const eligible: typeof rows = [];
  for (const row of rows) {
    if (!row.student_id) {
      if (row.consent_status_snapshot === "opted_in" &&
          row.consent_source_snapshot === "admin_attestation" &&
          row.consent_reference_snapshot?.trim()) eligible.push(row);
      else excluded.push({ studentId: "", reason: "Manual recipient consent evidence is missing" });
      continue;
    }
    const currentPhone = row.student_id
      ? normalizeGhanaSmsNumber(phoneByStudentId.get(row.student_id))
      : { ok: false as const, reason: "missing" as const };
    const optedIn = row.student_id ? consentByStudentId.get(row.student_id) === "opted_in" : false;
    if (currentPhone.ok && currentPhone.e164 === row.recipient_phone && optedIn) {
      eligible.push(row);
      continue;
    }
    excluded.push({
      studentId: row.student_id ?? "",
      reason: optedIn ? "Phone number changed after selection" : "SMS opt-in is no longer active",
    });
    await client.from("sms_campaign_recipients").update({
      status: "suppressed",
      error_message: optedIn ? "Phone number changed after selection; no SMS was sent." : "SMS opt-in is no longer active; no SMS was sent.",
    }).eq("id", row.id).eq("status", expectedStatus);
  }
  const claimed: Array<{ id: string; recipient_phone: string }> = [];
  let claimUncertain = false;
  for (const row of eligible) {
    if (row.attempt_count >= 5) {
      excluded.push({ studentId: "", reason: "Maximum of five submission attempts reached" });
      continue;
    }
    const { data, error } = await client
      .from("sms_campaign_recipients")
      .update({ status: "submitting", attempt_count: row.attempt_count + 1 })
      .eq("id", row.id)
      .eq("status", expectedStatus)
      .eq("attempt_count", row.attempt_count)
      .select("id,recipient_phone")
      .maybeSingle();
    if (error) {
      claimUncertain = true;
      await client.from("sms_campaign_recipients").update({
        status: "uncertain",
        error_message: "Submission state could not be confirmed; reconcile before any retry.",
      }).eq("id", row.id);
    } else if (data) {
      claimed.push(data);
    }
  }
  if (claimUncertain) {
    await client.from("sms_campaign_recipients").update({
      status: expectedStatus,
      error_message: null,
    }).in("id", claimed.map(({ id }) => id)).eq("status", "submitting");
    await client.from("sms_campaigns").update({ status: "uncertain" }).eq("id", campaignId);
    return { ok: false as const, error: "Submission could not be claimed safely; no provider request was sent. Reconcile campaign state before retrying.", campaignId, uncertain: true };
  }
  if (!claimed.length) {
    if (eligible.length === 0) await client.from("sms_campaigns").update({ status: "failed" }).eq("id", campaignId);
    const counts = await countsForCampaign(client, campaignId);
    if (!counts) return { ok: false as const, error: "Campaign status could not be loaded.", campaignId, uncertain: true };
    const { data: campaign } = await client.from("sms_campaigns").select("status").eq("id", campaignId).maybeSingle();
    revalidatePath("/admin/sms");
    return {
      ok: true as const,
      data: {
        campaignId,
        status: campaign?.status ?? "uncertain",
        replayed: eligible.length > 0,
        ...counts,
        excluded,
      },
    };
  }

  for (let offset = 0; offset < claimed.length; offset += ARKESEL_SMS_BATCH_SIZE) {
    const batch = claimed.slice(offset, offset + ARKESEL_SMS_BATCH_SIZE);
    let submission: Awaited<ReturnType<typeof submitArkeselSmsBatch>>;
    try {
      submission = await submitArkeselSmsBatch(providerConfig, {
        recipients: batch.map(({ recipient_phone }) => ({ phoneNumber: recipient_phone })),
        message,
      });
    } catch {
      submission = { status: "uncertain", error: "Arkesel result could not be confirmed; reconcile before retrying." };
    }
    const acceptedByPhone = submission.status === "provider_accepted"
      ? new Map(submission.recipients.map((accepted) => [accepted.phoneNumber, accepted.providerReference]))
      : new Map<string, string>();
    const definitiveFailure = submission.status === "failed";
    for (const recipient of batch) {
      const reference = acceptedByPhone.get(recipient.recipient_phone);
      const status = reference
        ? "provider_accepted"
        : definitiveFailure
          ? "failed"
          : "uncertain";
      const errorMessage = reference
        ? null
        : submission.status === "failed"
          ? submission.error
          : submission.status === "uncertain"
            ? submission.error
            : "Arkesel did not return a reference for this number; check delivery status before retrying.";
      const { error } = await client
        .from("sms_campaign_recipients")
        .update({
          status,
          provider_reference: reference ?? null,
          error_message: errorMessage,
        })
        .eq("id", recipient.id)
        .eq("status", "submitting");
      if (error) {
        await client
          .from("sms_campaign_recipients")
          .update({ status: "uncertain", error_message: "Provider result could not be saved; reconcile in Arkesel before retrying." })
          .eq("id", recipient.id);
      }
      if (reference && !error) {
        try {
          await applyWaitingDeliveryEvents(recipient.id, reference);
        } catch {
          console.error("[sms campaigns] A saved early delivery event could not be reconciled.");
        }
      }
    }
  }

  const { data: statuses, error: statusReadError } = await client
    .from("sms_campaign_recipients")
    .select("status")
    .eq("campaign_id", campaignId);
  if (statusReadError || !statuses) return { ok: false as const, error: "Provider result was received but could not be fully reconciled; review campaign history.", campaignId, uncertain: true };
  const status = statusFromRecipients(statuses.map((item) => item.status));
  const { error: campaignUpdateError } = await client.from("sms_campaigns").update({ status }).eq("id", campaignId);
  if (campaignUpdateError) return { ok: false as const, error: "SMS submission finished, but campaign status could not be saved. Review campaign history.", campaignId, uncertain: true };

  revalidatePath("/admin/sms");
  const counts = await countsForCampaign(client, campaignId);
  if (!counts) return { ok: false as const, error: "Campaign was submitted but recipient status could not be loaded.", campaignId, uncertain: true };
  return { ok: true as const, data: { campaignId, status, replayed: false, ...counts, excluded } };
}

export async function retryFailedSmsRecipientsAction(campaignId: unknown): Promise<SmsActionResult<{
  campaignId: string;
  status: SmsCampaignStatus;
  replayed: boolean;
  accepted: number;
  delivered: number;
  failed: number;
  uncertain: number;
  suppressed: number;
  excluded: Array<{ studentId: string; reason: string }>;
}>> {
  if (!await authorized()) return { ok: false, error: "Unauthorized. A valid admin session is required." };
  if (typeof campaignId !== "string" || !campaignId.trim()) return { ok: false, error: "A campaign is required." };
  let providerConfig;
  try {
    providerConfig = getArkeselConfiguration();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "SMS provider configuration is incomplete." };
  }
  const client = createSmsAdminClient();
  const { data: campaign, error: campaignError } = await client
    .from("sms_campaigns")
    .select("id,message,status")
    .eq("id", campaignId.trim())
    .maybeSingle();
  if (campaignError || !campaign) return { ok: false, error: "The campaign could not be found." };
  const { data: failedRows, error } = await client
    .from("sms_campaign_recipients")
    .select("id,student_id,attempt_count,recipient_phone,consent_status_snapshot,consent_source_snapshot,consent_reference_snapshot")
    .eq("campaign_id", campaign.id)
    .eq("status", "failed");
  if (error) return { ok: false, error: "Failed recipient records could not be loaded." };
  if (!failedRows?.length) {
    const counts = await countsForCampaign(client, campaign.id);
    if (!counts) return { ok: false, error: "Campaign status could not be loaded.", campaignId: campaign.id, uncertain: true };
    return { ok: true, data: { campaignId: campaign.id, status: campaign.status, replayed: true, ...counts, excluded: [] } };
  }
  const studentIds = [...new Set(failedRows.flatMap((row) => row.student_id ? [row.student_id] : []))];
  const [{ data: students, error: studentError }, { data: preferences, error: preferenceError }] = studentIds.length
    ? await Promise.all([
      client.from("students").select("id,display_name,phone_number").in("id", studentIds),
      client.from("student_sms_preferences").select("student_id,status").in("student_id", studentIds),
    ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (studentError || preferenceError) return { ok: false, error: "Current phone and consent records could not be verified.", campaignId: campaign.id };
  const preferenceByStudent = new Map((preferences ?? []).map((row) => [row.student_id, row.status]));
  const studentById = new Map((students ?? []).map((row) => [row.id, row]));
  const eligible: Array<{ id: string; student_id: string | null; recipient_phone: string; attempt_count: number; consent_status_snapshot: "opted_in"; consent_source_snapshot: string; consent_reference_snapshot: string | null }> = [];
  for (const row of failedRows) {
    if (row.attempt_count >= 5) continue;
    if (!row.student_id) {
      if (row.consent_status_snapshot === "opted_in" && row.consent_source_snapshot === "admin_attestation" && row.consent_reference_snapshot?.trim()) {
        eligible.push({
          id: row.id,
          student_id: null,
          recipient_phone: row.recipient_phone,
          attempt_count: row.attempt_count,
          consent_status_snapshot: row.consent_status_snapshot,
          consent_source_snapshot: row.consent_source_snapshot,
          consent_reference_snapshot: row.consent_reference_snapshot,
        });
      }
      continue;
    }
    const student = row.student_id ? studentById.get(row.student_id) : undefined;
    if (!student || preferenceByStudent.get(student.id) !== "opted_in") continue;
    const normalized = normalizeGhanaSmsNumber(student.phone_number);
    if (normalized.ok) eligible.push({
      id: row.id,
      student_id: row.student_id,
      recipient_phone: normalized.e164,
      attempt_count: row.attempt_count,
      consent_status_snapshot: row.consent_status_snapshot,
      consent_source_snapshot: row.consent_source_snapshot,
      consent_reference_snapshot: row.consent_reference_snapshot,
    });
  }
  const unique = [...new Map(eligible.map((row) => [row.recipient_phone, row])).values()];
  if (!unique.length) {
    const counts = await countsForCampaign(client, campaign.id);
    if (!counts) return { ok: false, error: "Campaign status could not be loaded.", campaignId: campaign.id, uncertain: true };
    return { ok: true, data: { campaignId: campaign.id, status: campaign.status, replayed: true, ...counts, excluded: [] } };
  }
  return submitCampaignRows(client, providerConfig, campaign.id, campaign.message, unique, [], "failed");
}

export async function getSmsCampaignHistoryAction(): Promise<SmsActionResult<SmsCampaign[]>> {
  if (!await authorized()) return { ok: false, error: "Unauthorized. A valid admin session is required." };
  const client = createSmsAdminClient();
  const { data: campaigns, error } = await client
    .from("sms_campaigns")
    .select("id,sender_id,sender_name,message,purpose,status,created_at,updated_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(10);
  if (error) return { ok: false, error: "SMS campaign history could not be loaded." };
  if (!campaigns?.length) return { ok: true, data: [] };
  const { data: recipients, error: recipientError } = await client
    .from("sms_campaign_recipients")
    .select("id,campaign_id,student_id,recipient_name,recipient_phone,status,provider_reference,provider_status,attempt_count,consent_source_snapshot,consent_reference_snapshot,error_message,delivery_updated_at,created_at,updated_at")
    .in("campaign_id", campaigns.map((campaign) => campaign.id))
    .order("created_at", { ascending: true });
  if (recipientError) return { ok: false, error: "SMS recipient statuses could not be loaded." };
  const grouped = new Map<string, SmsCampaign["recipients"]>();
  for (const row of recipients ?? []) {
    const { campaign_id: campaignId, ...recipient } = row;
    grouped.set(campaignId, [...(grouped.get(campaignId) ?? []), recipient as SmsCampaign["recipients"][number]]);
  }
  return {
    ok: true,
    data: campaigns.map((campaign) => ({
      ...campaign,
      status: campaign.status as SmsCampaignStatus,
      recipients: grouped.get(campaign.id) ?? [],
    })),
  };
}

export async function deleteSmsCampaignsAction(input: unknown): Promise<SmsActionResult<{ deleted: number }>> {
  if (!await authorized()) return { ok: false, error: "Unauthorized. A valid admin session is required." };
  const normalized = normalizeSmsCampaignIds(input);
  if (!normalized.ok) return normalized;

  const client = createSmsAdminClient();
  const { data: campaigns, error: campaignError } = await client
    .from("sms_campaigns")
    .select("id,status")
    .in("id", normalized.ids);
  if (campaignError || !campaigns || campaigns.length !== normalized.ids.length) {
    return { ok: false, error: "One or more selected campaigns could not be found." };
  }
  if (campaigns.some(({ status }) => status === "sending" || status === "uncertain")) {
    return { ok: false, error: "Sending or uncertain campaigns are protected until their provider outcome is resolved." };
  }

  const { data, error } = await client.rpc("delete_sms_campaigns_admin", {
    p_campaign_ids: normalized.ids,
  });
  if (error || data !== normalized.ids.length) {
    console.error("[sms campaigns] Selected campaign history could not be deleted.");
    return { ok: false, error: "Selected campaign history could not be deleted. Refresh and try again." };
  }

  revalidatePath("/admin/sms");
  return { ok: true, data: { deleted: data } };
}
