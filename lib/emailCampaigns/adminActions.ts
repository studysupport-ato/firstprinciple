"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AdminUnauthorizedError, requireAdmin } from "@/lib/adminSession";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import { getEmailPublicConfiguration, getResendConfiguration } from "./config";
import { renderBrandedEmail } from "./template";
import type {
  CampaignRecipient,
  EmailActionResult,
  EmailCampaign,
  EmailCampaignStatus,
  EmailRecipientStatus,
} from "./types";
import {
  EMAIL_CAMPAIGN_MAX_RECIPIENTS,
  isValidEmailAddress,
  normalizeManualEmailRecipients,
  normalizeRecipientIds,
  validateEmailCampaignContent,
} from "./validation";
import { submitBrandedEmail } from "./resendProvider";
import { mergeManualEmailRecipients, resolveCampaignRecipients } from "./recipients";
import { deriveCampaignStatus } from "./status";
import { isEmailAdminAuthorized } from "./authorization";

type SendCampaignData = {
  campaignId: string;
  status: EmailCampaignStatus;
  replayed: boolean;
  accepted: number;
  failed: number;
  uncertain: number;
};

type SendableRecipient = Pick<CampaignRecipient, "id" | "recipient_email">;

type EmailCampaignDatabase = {
  public: {
    Tables: {
      email_campaigns: {
        Row: {
          [key: string]: unknown;
          id: string;
          idempotency_key: string;
          sender_id: string;
          subject: string;
          message: string;
          status: EmailCampaignStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          [key: string]: unknown;
          idempotency_key: string;
          sender_id: string;
          subject: string;
          message: string;
          status?: EmailCampaignStatus;
        };
        Update: Partial<EmailCampaignDatabase["public"]["Tables"]["email_campaigns"]["Insert"]>;
        Relationships: [];
      };
      email_campaign_recipients: {
        Row: {
          [key: string]: unknown;
          id: string;
          campaign_id: string;
          student_id: string | null;
          recipient_name: string | null;
          recipient_email: string;
          status: EmailRecipientStatus;
          provider_message_id: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          [key: string]: unknown;
          campaign_id: string;
          student_id?: string | null;
          recipient_name?: string | null;
          recipient_email: string;
          status?: EmailRecipientStatus;
        };
        Update: Partial<EmailCampaignDatabase["public"]["Tables"]["email_campaign_recipients"]["Insert"]>;
        Relationships: [];
      };
      students: {
        Row: { [key: string]: unknown; id: string; display_name: string; email: string | null; created_at: string };
        Insert: { [key: string]: unknown; id: string; display_name: string; email?: string | null; created_at?: string };
        Update: Partial<EmailCampaignDatabase["public"]["Tables"]["students"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

function createEmailCampaignAdminClient(): SupabaseClient<EmailCampaignDatabase> {
  // The shared hand-maintained Database type does not provide this feature's
  // typed query shape; keep the assertion limited to tables in this migration.
  return createSupabaseAdminClient() as unknown as SupabaseClient<EmailCampaignDatabase>;
}

async function authorizeAdmin(): Promise<boolean> {
  return isEmailAdminAuthorized(
    requireAdmin,
    (error) => error instanceof AdminUnauthorizedError,
    () => console.error("[email campaigns] Admin session validation failed."),
  );
}

async function deliverCampaignRecipient(
  client: SupabaseClient<EmailCampaignDatabase>,
  recipient: SendableRecipient,
  subject: string,
  message: string,
  expectedStatus: "queued" | "failed",
): Promise<"provider_accepted" | "failed" | "uncertain"> {
  const { data: submitting, error: transitionError } = await client
    .from("email_campaign_recipients")
    .update({
      status: "submitting",
      recipient_email: recipient.recipient_email,
      error_message: null,
    })
    .eq("id", recipient.id)
    .eq("status", expectedStatus)
    .select("id")
    .maybeSingle();
  if (transitionError) {
    await client
      .from("email_campaign_recipients")
      .update({ status: "uncertain", error_message: "The submission state could not be confirmed; no automatic retry was attempted." })
      .eq("id", recipient.id);
    return "uncertain";
  }
  if (!submitting) return "uncertain";

  try {
    const response = await submitBrandedEmail(
      getResendConfiguration(),
      {
        recipient: recipient.recipient_email,
        subject,
        html: renderBrandedEmail({
          subject,
          message,
          logoUrl: process.env.FIRST_PRINCIPLES_EMAIL_LOGO_URL,
          platformUrl: process.env.FIRST_PRINCIPLES_PLATFORM_URL || process.env.NEXT_PUBLIC_SITE_URL,
        }),
      },
    );
    const { error: updateError } = await client
      .from("email_campaign_recipients")
      .update({
        status: response.status,
        provider_message_id: response.status === "provider_accepted" ? response.messageId : null,
        error_message: response.status === "provider_accepted" ? null : response.error,
      })
      .eq("id", recipient.id);
    if (!updateError) return response.status;

    console.error("[email campaigns] Recipient provider outcome could not be saved.");
  } catch {
    console.error("[email campaigns] Recipient submission outcome could not be resolved.");
  }

  await client
    .from("email_campaign_recipients")
    .update({
      status: "uncertain",
      error_message: "Provider outcome could not be saved; verify provider status before retrying.",
    })
    .eq("id", recipient.id);
  return "uncertain";
}

export async function getEmailCampaignConfigurationAction(): Promise<
  EmailActionResult<ReturnType<typeof getEmailPublicConfiguration>>
> {
  if (!await authorizeAdmin()) return { ok: false, error: "Unauthorized. A valid admin session is required." };
  return { ok: true, data: getEmailPublicConfiguration() };
}

export async function sendEmailCampaignAction(
  input: unknown,
): Promise<EmailActionResult<SendCampaignData>> {
  if (!await authorizeAdmin()) return { ok: false, error: "Unauthorized. A valid admin session is required." };
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid campaign request." };
  const record = input as Record<string, unknown>;
  const content = validateEmailCampaignContent(record);
  if (!content.ok) return content;
  const audience = record.audience === "all" ? "all" : "custom";
  const manualRecipients = normalizeManualEmailRecipients(record.manualEmails);
  if (!manualRecipients.ok) return manualRecipients;
  const submittedIds = Array.isArray(record.studentIds) ? record.studentIds : [];
  const recipientIds = audience === "custom"
    ? submittedIds.length
      ? normalizeRecipientIds(submittedIds)
      : { ok: true as const, ids: [] }
    : { ok: true as const, ids: [] };
  if (!recipientIds.ok) return recipientIds;
  if (audience === "custom" && recipientIds.ids.length === 0 && manualRecipients.emails.length === 0) {
    return { ok: false, error: "Choose all users, select custom students, or add at least one email address." };
  }
  if (typeof record.idempotencyKey !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(record.idempotencyKey)) {
    return { ok: false, error: "Refresh the page and try sending again." };
  }
  try {
    getResendConfiguration();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Email sending is not configured." };
  }

  const client = createEmailCampaignAdminClient();
  const { data: existing, error: existingError } = await client
    .from("email_campaigns")
    .select("id,status")
    .eq("idempotency_key", record.idempotencyKey)
    .maybeSingle();
  if (existingError) {
    console.error("[email campaigns] Could not check campaign idempotency.");
    return { ok: false, error: "Campaign status could not be checked. Do not start a new send until it is reviewed." };
  }
  if (existing) {
    const counts = await getCampaignCounts(existing.id);
    if (!counts) return { ok: false, error: "The existing campaign is recorded, but its recipient status could not be loaded.", campaignId: existing.id, uncertain: true };
    return {
      ok: true,
      data: { campaignId: existing.id, status: existing.status as EmailCampaignStatus, replayed: true, ...counts },
    };
  }

  let studentRecipients: Array<{ student_id: string | null; recipient_name: string | null; recipient_email: string }> = [];
  if (audience === "all") {
    const seen = new Set<string>();
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data: students, error } = await client
        .from("students")
        .select("id,display_name,email")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + pageSize - 1)
        .abortSignal(AbortSignal.timeout(30_000));
      if (error) return { ok: false, error: "All student email recipients could not be loaded. Nothing was sent." };
      for (const student of students ?? []) {
        if (!student.email || !isValidEmailAddress(student.email)) continue;
        const key = student.email.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        studentRecipients.push({
          student_id: student.id,
          recipient_name: student.display_name,
          recipient_email: student.email.trim(),
        });
        if (studentRecipients.length > EMAIL_CAMPAIGN_MAX_RECIPIENTS) {
          return { ok: false, error: `This audience exceeds the ${EMAIL_CAMPAIGN_MAX_RECIPIENTS.toLocaleString()} recipient safety limit.` };
        }
      }
      if (!students || students.length < pageSize) break;
    }
    if (!studentRecipients.length) return { ok: false, error: "No students have a valid email address." };
  } else if (recipientIds.ids.length) {
    const { data: students, error: studentError } = await client
      .from("students")
      .select("id,display_name,email")
      .in("id", recipientIds.ids)
      .abortSignal(AbortSignal.timeout(15_000));
    if (studentError) {
      console.error("[email campaigns] Could not resolve campaign recipients.");
      return { ok: false, error: "Selected student records could not be verified." };
    }
    const resolved = resolveCampaignRecipients(recipientIds.ids, students);
    if (!resolved.ok) return resolved;
    studentRecipients = resolved.recipients;
  }
  const recipientsToSend = mergeManualEmailRecipients(studentRecipients, manualRecipients.emails);
  if (!recipientsToSend.length) return { ok: false, error: "No valid email recipients were selected." };
  if (recipientsToSend.length > EMAIL_CAMPAIGN_MAX_RECIPIENTS) {
    return { ok: false, error: `A campaign can include at most ${EMAIL_CAMPAIGN_MAX_RECIPIENTS.toLocaleString()} recipients.` };
  }

  const { data: campaign, error: insertCampaignError } = await client
    .from("email_campaigns")
    .insert({
      idempotency_key: record.idempotencyKey,
      sender_id: "admin",
      subject: content.data.subject,
      message: content.data.message,
      status: "sending",
    })
    .select("id,status")
    .single();

  if (insertCampaignError || !campaign) {
    if (insertCampaignError?.code === "23505") {
      const { data: duplicate } = await client
        .from("email_campaigns")
        .select("id,status")
        .eq("idempotency_key", record.idempotencyKey)
        .maybeSingle();
      if (duplicate) {
        const counts = await getCampaignCounts(duplicate.id);
        if (!counts) return { ok: false, error: "The existing campaign is recorded, but its recipient status could not be loaded.", campaignId: duplicate.id, uncertain: true };
        return {
          ok: true,
          data: { campaignId: duplicate.id, status: duplicate.status as EmailCampaignStatus, replayed: true, ...counts },
        };
      }
    }
    console.error("[email campaigns] Could not create campaign record.");
    return { ok: false, error: "The campaign could not be saved; no emails were sent." };
  }

  const recipients = recipientsToSend.map((student) => ({
    campaign_id: campaign.id,
    student_id: student.student_id,
    recipient_name: student.recipient_name,
    recipient_email: student.recipient_email,
    status: "queued" as const,
  }));
  const insertedRecipients: CampaignRecipient[] = [];
  for (let offset = 0; offset < recipients.length; offset += 250) {
    const { data, error } = await client
      .from("email_campaign_recipients")
      .insert(recipients.slice(offset, offset + 250))
      .select("id,student_id,recipient_name,recipient_email,status,provider_message_id,error_message,created_at,updated_at");
    if (error || !data) {
      await client.from("email_campaigns").update({ status: "failed" }).eq("id", campaign.id);
      console.error("[email campaigns] Could not persist recipient snapshots.");
      return { ok: false, error: "The campaign recipient records could not be saved; no emails were sent.", campaignId: campaign.id };
    }
    insertedRecipients.push(...data);
  }

  let nextRecipient = 0;
  const results: Array<"provider_accepted" | "failed" | "uncertain"> = [];
  const workers = Array.from({ length: Math.min(4, insertedRecipients.length) }, async () => {
    while (nextRecipient < insertedRecipients.length) {
      const index = nextRecipient++;
      const recipient = insertedRecipients[index] as CampaignRecipient;
      results[index] = await deliverCampaignRecipient(client, recipient, content.data.subject, content.data.message, "queued");
    }
  });
  await Promise.all(workers);

  const accepted = results.filter((result) => result === "provider_accepted").length;
  const failed = results.filter((result) => result === "failed").length;
  const uncertain = results.filter((result) => result === "uncertain").length;
  const status = deriveCampaignStatus(results);
  const { error: campaignUpdateError } = await client
    .from("email_campaigns")
    .update({ status })
    .eq("id", campaign.id);
  if (campaignUpdateError) {
    console.error("[email campaigns] Campaign status update failed after provider submissions.");
    revalidatePath("/admin/email");
    return {
      ok: false,
      error: "Provider submissions finished, but the campaign summary could not be saved. Review campaign history before taking further action.",
      campaignId: campaign.id,
      uncertain: true,
    };
  }
  revalidatePath("/admin/email");
  return { ok: true, data: { campaignId: campaign.id, status, replayed: false, accepted, failed, uncertain } };
}

export async function retryFailedEmailRecipientsAction(
  campaignId: unknown,
): Promise<EmailActionResult<SendCampaignData>> {
  if (!await authorizeAdmin()) return { ok: false, error: "Unauthorized. A valid admin session is required." };
  if (typeof campaignId !== "string" || !campaignId.trim()) return { ok: false, error: "A campaign is required." };

  try {
    getResendConfiguration();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Email sending is not configured." };
  }

  const client = createEmailCampaignAdminClient();
  const { data: campaign, error: campaignError } = await client
    .from("email_campaigns")
    .select("id,subject,message,status")
    .eq("id", campaignId.trim())
    .maybeSingle();
  if (campaignError || !campaign) return { ok: false, error: "The campaign could not be found." };

  const { data: failedRecipients, error: failedRecipientsError } = await client
    .from("email_campaign_recipients")
    .select("id,student_id,recipient_email")
    .eq("campaign_id", campaign.id)
    .eq("status", "failed");
  if (failedRecipientsError) return { ok: false, error: "Failed recipients could not be loaded." };
  if (!failedRecipients?.length) {
    const counts = await getCampaignCounts(campaign.id);
    if (!counts) return { ok: false, error: "Campaign recipient status could not be loaded.", campaignId: campaign.id, uncertain: true };
    return {
      ok: true,
      data: { campaignId: campaign.id, status: campaign.status, replayed: true, ...counts },
    };
  }

  const studentIds = [...new Set(failedRecipients.flatMap((recipient) => recipient.student_id ? [recipient.student_id] : []))];
  const { data: students, error: studentsError } = studentIds.length
    ? await client.from("students").select("id,display_name,email").in("id", studentIds)
    : { data: [], error: null };
  if (studentsError) return { ok: false, error: "Current student email addresses could not be verified.", campaignId: campaign.id };
  const emailByStudentId = new Map(
    (students ?? [])
      .filter((student) => student.email && isValidEmailAddress(student.email))
      .map((student) => [student.id, student.email as string]),
  );

  let nextRecipient = 0;
  const workers = Array.from({ length: Math.min(4, failedRecipients.length) }, async () => {
    while (nextRecipient < failedRecipients.length) {
      const index = nextRecipient++;
      const recipient = failedRecipients[index];
      const currentEmail = recipient.student_id
        ? emailByStudentId.get(recipient.student_id)
        : isValidEmailAddress(recipient.recipient_email) ? recipient.recipient_email : undefined;
      if (!currentEmail) {
        continue;
      }
      await deliverCampaignRecipient(
        client,
        { id: recipient.id, recipient_email: currentEmail },
        campaign.subject,
        campaign.message,
        "failed",
      );
    }
  });
  await Promise.all(workers);

  const { data: allRecipients, error: statusesError } = await client
    .from("email_campaign_recipients")
    .select("status")
    .eq("campaign_id", campaign.id);
  if (statusesError || !allRecipients) {
    return {
      ok: false,
      error: "Recipient retries finished, but campaign status could not be confirmed. Review campaign history.",
      campaignId: campaign.id,
      uncertain: true,
    };
  }
  const status = deriveCampaignStatus(allRecipients.map((recipient) =>
    recipient.status === "provider_accepted" ? "provider_accepted" : recipient.status === "failed" ? "failed" : "uncertain",
  ));
  const { error: statusUpdateError } = await client
    .from("email_campaigns")
    .update({ status })
    .eq("id", campaign.id);
  if (statusUpdateError) {
    return {
      ok: false,
      error: "Recipient retries finished, but the campaign summary could not be saved. Review campaign history.",
      campaignId: campaign.id,
      uncertain: true,
    };
  }
  const counts = await getCampaignCounts(campaign.id);
  if (!counts) {
    return {
      ok: false,
      error: "Recipient retries finished, but campaign recipient status could not be loaded. Review campaign history.",
      campaignId: campaign.id,
      uncertain: true,
    };
  }
  revalidatePath("/admin/email");
  return { ok: true, data: { campaignId: campaign.id, status, replayed: false, ...counts } };
}

async function getCampaignCounts(campaignId: string) {
  const client = createEmailCampaignAdminClient();
  const { data, error } = await client
    .from("email_campaign_recipients")
    .select("status")
    .eq("campaign_id", campaignId);
  if (error || !data) {
    console.error("[email campaigns] Could not load recipient counts.");
    return null;
  }
  const statuses = data;
  return {
    accepted: statuses.filter((row) => row.status === "provider_accepted").length,
    failed: statuses.filter((row) => row.status === "failed").length,
    uncertain: statuses.filter((row) => row.status === "uncertain" || row.status === "submitting").length,
  };
}

export async function getEmailCampaignHistoryAction(): Promise<EmailActionResult<EmailCampaign[]>> {
  if (!await authorizeAdmin()) return { ok: false, error: "Unauthorized. A valid admin session is required." };
  const client = createEmailCampaignAdminClient();
  const { data: campaigns, error } = await client
    .from("email_campaigns")
    .select("id,sender_id,subject,message,status,created_at,updated_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(10);
  if (error) {
    console.error("[email campaigns] Could not load campaign history.");
    return { ok: false, error: "Campaign history could not be loaded." };
  }
  if (!campaigns?.length) return { ok: true, data: [] };
  const { data: recipients, error: recipientError } = await client
    .from("email_campaign_recipients")
    .select("id,campaign_id,student_id,recipient_name,recipient_email,status,provider_message_id,error_message,created_at,updated_at")
    .in("campaign_id", campaigns.map(({ id }) => id))
    .order("created_at", { ascending: true });
  if (recipientError) {
    console.error("[email campaigns] Could not load recipient delivery states.");
    return { ok: false, error: "Campaign recipient status could not be loaded." };
  }
  const grouped = new Map<string, CampaignRecipient[]>();
  for (const row of recipients ?? []) {
    const { campaign_id: campaignId, ...recipient } = row;
    grouped.set(campaignId, [...(grouped.get(campaignId) ?? []), recipient as CampaignRecipient]);
  }
  return {
    ok: true,
    data: campaigns.map((row) => ({
      ...row,
      sender_id: "admin",
      status: row.status as EmailCampaignStatus,
      recipients: grouped.get(row.id) ?? [],
    })),
  };
}
