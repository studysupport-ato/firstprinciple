"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Eye, Mail, RefreshCw, Search, Send, Users, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getAdminStudentRecipientPageAction } from "@/lib/student/adminDirectoryActions";
import type { StudentRecipientPage, StudentDirectoryProfile } from "@/lib/student/adminDirectory";
import {
  getEmailCampaignConfigurationAction,
  getEmailCampaignHistoryAction,
  retryFailedEmailRecipientsAction,
  sendEmailCampaignAction,
} from "@/lib/emailCampaigns/adminActions";
import { renderBrandedEmail } from "@/lib/emailCampaigns/template";
import type { EmailCampaign, EmailPublicConfiguration } from "@/lib/emailCampaigns/types";
import { EMAIL_MESSAGE_MAX_LENGTH, EMAIL_SUBJECT_MAX_LENGTH, isValidEmailAddress } from "@/lib/emailCampaigns/validation";
import { canRetryFailedRecipient } from "@/lib/emailCampaigns/status";

const PAGE_SIZE = 25;
type SelectedStudent = Pick<StudentDirectoryProfile, "studentId" | "fullName" | "email">;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default function AdminEmailPage() {
  const [directory, setDirectory] = useState<StudentRecipientPage | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recipientMode, setRecipientMode] = useState<"all" | "custom" | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, SelectedStudent>>(() => new Map());
  const [manualEmailInput, setManualEmailInput] = useState("");
  const [manualEmails, setManualEmails] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [configuration, setConfiguration] = useState<EmailPublicConfiguration | null>(null);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [retryingCampaignId, setRetryingCampaignId] = useState<string | null>(null);
  const [sendKey, setSendKey] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const result = await getEmailCampaignHistoryAction();
      if (result.ok) {
        setCampaigns(result.data);
        setHistoryError(null);
      } else {
        setHistoryError(result.error);
      }
    } catch {
      setHistoryError("Campaign history could not be loaded.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    let active = true;
    const timer = setTimeout(() => {
      setLoadingStudents(true);
      void getAdminStudentRecipientPageAction(page, PAGE_SIZE, search)
        .then((result) => {
          if (!active) return;
          if (result.ok) {
            setDirectory(result.data);
            setPage(result.data.page);
            setDirectoryError(null);
          } else {
            setDirectoryError(result.error);
          }
        })
        .catch(() => {
          if (active) setDirectoryError("Student recipients could not be loaded.");
        })
        .finally(() => {
          if (active) setLoadingStudents(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page, pickerOpen, search]);

  useEffect(() => {
    let active = true;
    void getEmailCampaignConfigurationAction()
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setConfiguration(result.data);
          setConfigurationError(null);
        } else {
          setConfigurationError(result.error);
        }
      })
      .catch(() => {
        if (active) setConfigurationError("Email setup status could not be loaded.");
      });
    void loadHistory();
    return () => {
      active = false;
    };
  }, [loadHistory]);

  const students = directory?.students ?? [];
  const selectedRecipients = useMemo(() => [...selected.values()], [selected]);
  const eligibleOnPage = students.filter((student) => Boolean(student.email && isValidEmailAddress(student.email)));
  const selectedOnPage = eligibleOnPage.filter((student) => selected.has(student.studentId)).length;
  const allPageSelected = eligibleOnPage.length > 0 && selectedOnPage === eligibleOnPage.length;
  const previewHtml = useMemo(
    () => renderBrandedEmail({
      subject: subject.trim() || "Your message subject",
      message: message.trim() || "Your message will appear here.",
      logoUrl: configuration?.logoUrl,
      platformUrl: configuration?.platformUrl,
    }),
    [configuration, message, subject],
  );

  function toggleStudent(student: StudentDirectoryProfile) {
    if (!student.email || !isValidEmailAddress(student.email)) return;
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(student.studentId)) next.delete(student.studentId);
      else next.set(student.studentId, { studentId: student.studentId, fullName: student.fullName, email: student.email });
      return next;
    });
  }

  function togglePage() {
    const eligible = students.filter((student) => Boolean(student.email && isValidEmailAddress(student.email)));
    setSelected((current) => {
      const next = new Map(current);
      if (allPageSelected) eligible.forEach(({ studentId }) => next.delete(studentId));
      else eligible.forEach((student) => next.set(student.studentId, {
        studentId: student.studentId,
        fullName: student.fullName,
        email: student.email,
      }));
      return next;
    });
  }

  function addManualEmails() {
    const entries = manualEmailInput.split(/[,\n;]+/).map((email) => email.trim()).filter(Boolean);
    if (!entries.length || entries.some((email) => !isValidEmailAddress(email))) {
      setSendError("Enter valid email addresses separated by commas or new lines.");
      return;
    }
    setManualEmails((current) => [...new Set([...current, ...entries.map((email) => email.toLowerCase())])]);
    setManualEmailInput("");
    setSendError(null);
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendError(null);
    setSendMessage(null);
    if (recipientMode === null && !selected.size && !manualEmails.length) {
      setSendError("Choose all users, select custom students, or add an email address.");
      return;
    }
    const audienceLabel = recipientMode === "all"
      ? "all students with valid email addresses"
      : `${selected.size + manualEmails.length} selected recipient${selected.size + manualEmails.length === 1 ? "" : "s"}`;
    if (!window.confirm(`Send this email to ${audienceLabel}? Each recipient will receive a private individual email.`)) {
      return;
    }
    const key = sendKey ?? crypto.randomUUID();
    setSendKey(key);
    setSending(true);
    try {
      const result = await sendEmailCampaignAction({
        audience: recipientMode ?? "custom",
        studentIds: selectedRecipients.map(({ studentId }) => studentId),
        manualEmails,
        subject,
        message,
        idempotencyKey: key,
      });
      if (result.ok) {
        const summary = result.data.replayed
          ? "This request was already recorded; no duplicate emails were sent."
          : `${result.data.accepted} provider-accepted, ${result.data.failed} failed, ${result.data.uncertain} uncertain. Provider acceptance does not confirm delivery.`;
        setSendMessage(`Campaign ${result.data.status.replaceAll("_", " ")}. ${summary}`);
        setSendKey(null);
        if (!result.data.replayed) {
          setSelected(new Map());
          setManualEmails([]);
          setRecipientMode(null);
        }
        await loadHistory();
      } else {
        setSendError(result.error);
        if (!result.campaignId && !result.uncertain) setSendKey(null);
        else await loadHistory();
      }
    } catch {
      setSendError("The request did not return a result. Retry the status check with the same request key; it will not start another send.");
    } finally {
      setSending(false);
    }
  }

  async function retryFailedRecipients(campaign: EmailCampaign) {
    const failedCount = campaign.recipients.filter((recipient) => canRetryFailedRecipient(recipient.status)).length;
    if (!failedCount || !window.confirm(`Retry ${failedCount} definitely failed recipient${failedCount === 1 ? "" : "s"} for “${campaign.subject}”? Uncertain submissions will not be retried.`)) {
      return;
    }
    setRetryingCampaignId(campaign.id);
    setSendError(null);
    setSendMessage(null);
    try {
      const result = await retryFailedEmailRecipientsAction(campaign.id);
      if (result.ok) {
        setSendMessage(`Retry complete: ${result.data.accepted} provider-accepted, ${result.data.failed} failed, ${result.data.uncertain} uncertain. Provider acceptance does not confirm delivery.`);
      } else {
        setSendError(result.error);
      }
      await loadHistory();
    } catch {
      setSendError("Retry status could not be confirmed. Review campaign history before taking further action.");
      await loadHistory();
    } finally {
      setRetryingCampaignId(null);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <AdminPageHeader
        title="Email"
        description="Create a branded email campaign and review each recipient’s provider status."
      />

      {configurationError ? <div role="alert" className="rounded-2xl border border-[#F1C7C1] bg-[#FFF7F5] p-4 text-sm text-[#8C2D1C]">{configurationError}</div> : null}
      {configuration && (!configuration.logoReady || !configuration.providerReady) ? (
        <div role="status" className="rounded-2xl border border-[#E5D39C] bg-[#FFF9E8] p-4 text-sm text-[#5B4812]">
          <p className="font-semibold">Email setup needs attention</p>
          <p className="mt-1">
            {configuration.logoReady
              ? "The First Principles logo is ready for email."
              : "The actual website logo is public/brand-logo.png, but email needs its public HTTPS URL configured before it can display."}
          </p>
          {!configuration.logoReady || !configuration.providerReady ? (
            <p className="mt-1">Configure: {configuration.missing.join(", ")}.</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <section className="rounded-3xl border border-[#E5E5E5] bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF4CC] text-[#111111]"><Mail size={18} /></div>
            <div>
              <h2 className="text-lg font-semibold">Compose email</h2>
              <p className="text-sm text-[#666666]">Plain-text content, rendered in the shared branded template.</p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSend}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Subject</span>
              <input
                required
                maxLength={EMAIL_SUBJECT_MAX_LENGTH}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 text-sm outline-none focus:border-[#111111]"
                placeholder="A clear, helpful subject"
              />
              <span className="mt-1 block text-right text-xs text-[#666666]">{subject.length}/{EMAIL_SUBJECT_MAX_LENGTH}</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Message</span>
              <textarea
                required
                maxLength={EMAIL_MESSAGE_MAX_LENGTH}
                rows={7}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="w-full resize-y rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#111111]"
                placeholder="Write your message. Blank lines create separate paragraphs."
              />
              <span className="mt-1 block text-right text-xs text-[#666666]">{message.length}/{EMAIL_MESSAGE_MAX_LENGTH}</span>
            </label>

            <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Users size={16} /> Recipients</div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setRecipientMode("all"); setSelected(new Map()); setPickerOpen(false); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${recipientMode === "all" ? "border-[#111111] bg-[#FFF4CC]" : "border-[#E5E5E5] bg-white"}`}>All Users</button>
                  <button type="button" onClick={() => { setRecipientMode("custom"); setPickerOpen(true); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${recipientMode === "custom" ? "border-[#111111] bg-[#FFF4CC]" : "border-[#E5E5E5] bg-white"}`}>Custom Users</button>
                </div>
              </div>
              <p className="mt-2 text-xs text-[#666666]">
                {recipientMode === "all"
                  ? "All registered students with a valid email address will be resolved securely when you send."
                  : `${selected.size} custom student${selected.size === 1 ? "" : "s"} selected. Add non-student email addresses below if needed.`}
              </p>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-medium">Additional email addresses</span>
                <span className="flex gap-2">
                  <input type="text" value={manualEmailInput} onChange={(event) => setManualEmailInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addManualEmails(); } }} placeholder="person@example.com, another@example.com" className="min-w-0 flex-1 rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm outline-none focus:border-[#111111]" />
                  <button type="button" onClick={addManualEmails} className="rounded-xl border border-[#E5E5E5] bg-white px-3 text-xs font-semibold">Add</button>
                </span>
              </label>
              {manualEmails.length ? <ul className="mt-2 flex flex-wrap gap-2">{manualEmails.map((email) => <li key={email} className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs">{email}<button type="button" aria-label={`Remove ${email}`} onClick={() => setManualEmails((current) => current.filter((item) => item !== email))}><X size={13} /></button></li>)}</ul> : null}
              {pickerOpen ? (
                <div role="dialog" aria-modal="true" aria-label="Select custom email recipients" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 sm:p-6">
                  <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-[#E5E5E5] bg-white p-5 shadow-xl sm:p-7">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div><h3 className="text-lg font-semibold">Choose custom students</h3><p className="text-sm text-[#666666]">Search the directory; only this page is loaded at a time.</p></div>
                      <button type="button" onClick={() => setPickerOpen(false)} aria-label="Close recipient picker" className="rounded-full p-2 hover:bg-[#F7F7F8]"><X size={18} /></button>
                    </div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold">{selected.size} selected</span>
                      <button type="button" onClick={togglePage} disabled={!students.length || loadingStudents} className="text-xs font-semibold underline decoration-[#FFBE00] underline-offset-4 disabled:opacity-50">{allPageSelected ? "Deselect eligible page" : "Select eligible page"}</button>
                    </div>
                    <label className="relative mb-3 block">
                      <Search size={15} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
                      <span className="sr-only">Search students by name or email</span>
                      <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or email..." className="w-full rounded-xl border border-[#E5E5E5] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#111111]" />
                    </label>
                    <p className="mb-2 text-xs text-[#666666]">Select eligible students on this page only ({eligibleOnPage.length} visible with valid email).</p>
                    {directoryError ? <p role="alert" className="mb-2 rounded-lg bg-[#FFF7F5] p-3 text-sm text-[#8C2D1C]">{directoryError}</p> : null}
                    <div className="min-h-40 flex-1 divide-y divide-[#EEEEEE] overflow-y-auto rounded-xl border border-[#E5E5E5] bg-white">
                      {loadingStudents ? <p className="p-4 text-sm text-[#666666]">Loading this page…</p> : null}
                      {!loadingStudents && !directoryError && !students.length ? <p className="p-4 text-sm text-[#666666]">No matching students.</p> : null}
                      {students.map((student) => {
                        const eligible = Boolean(student.email && isValidEmailAddress(student.email));
                        return <label key={student.studentId} className={`flex cursor-pointer items-start gap-3 p-3 ${eligible ? "hover:bg-[#FFFBF5]" : "cursor-not-allowed opacity-55"}`}><input type="checkbox" checked={selected.has(student.studentId)} disabled={!eligible} onChange={() => toggleStudent(student)} className="mt-1 accent-[#111111]" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{student.fullName || "Name unavailable"}</span><span className="block truncate text-xs text-[#666666]">{student.email || "No email available"}</span></span></label>;
                      })}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-[#666666]">
                      <span>Page {page}</span>
                      <div className="flex gap-2">
                        <button type="button" disabled={loadingStudents || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Previous student page" className="rounded-lg border border-[#E5E5E5] p-2 disabled:opacity-40"><ChevronLeft size={15} /></button>
                        <button type="button" disabled={loadingStudents || !directory?.hasNextPage} onClick={() => setPage((current) => current + 1)} aria-label="Next student page" className="rounded-lg border border-[#E5E5E5] p-2 disabled:opacity-40"><ChevronRight size={15} /></button>
                      </div>
                    </div>
                    <button type="button" onClick={() => setPickerOpen(false)} className="mt-4 self-end rounded-xl bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white">Done selecting</button>
                  </div>
                </div>
              ) : null}
            </div>

            {selectedRecipients.length || manualEmails.length ? (
              <div className="rounded-2xl border border-[#E5E5E5] p-4">
                <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                  <span>Review additional/custom recipients</span><span>{selectedRecipients.length + manualEmails.length}</span>
                </div>
                <ul className="max-h-28 space-y-1 overflow-auto text-xs text-[#666666]">
                  {selectedRecipients.map((recipient) => <li key={recipient.studentId}>{recipient.fullName} · {recipient.email}</li>)}
                  {manualEmails.map((email) => <li key={email}>External email · {email}</li>)}
                </ul>
              </div>
            ) : null}

            {sendError ? <div role="alert" className="rounded-xl border border-[#F1C7C1] bg-[#FFF7F5] p-3 text-sm text-[#8C2D1C]">{sendError}</div> : null}
            {sendMessage ? <div role="status" className="rounded-xl border border-[#CDE8D5] bg-[#F2FBF4] p-3 text-sm text-[#215B32]">{sendMessage}</div> : null}
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setShowPreview(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#E5E5E5] px-4 py-3 text-sm font-semibold hover:bg-[#FAFAFA]"><Eye size={16} /> Preview branded email</button>
              <button
                type="submit"
                disabled={sending || (recipientMode === null && !selected.size && !manualEmails.length) || !subject.trim() || !message.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {sending ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                {sending ? "Sending…" : sendKey ? "Check campaign status" : "Review and send"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-[#E5E5E5] bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Campaign history</h2>
              <p className="text-sm text-[#666666]">Provider acceptance is not a delivery confirmation.</p>
            </div>
            <button type="button" onClick={() => void loadHistory()} aria-label="Refresh campaign history" className="rounded-full border border-[#E5E5E5] p-2 hover:bg-[#FAFAFA]"><RefreshCw size={15} /></button>
          </div>
          {historyError ? <div role="alert" className="rounded-xl bg-[#FFF7F5] p-3 text-sm text-[#8C2D1C]">{historyError}</div> : null}
          {loadingHistory ? <p className="text-sm text-[#666666]">Loading campaign history…</p> : null}
          {!loadingHistory && !historyError && !campaigns.length ? <p className="rounded-2xl border border-dashed border-[#E5E5E5] p-6 text-center text-sm text-[#666666]">Campaigns will appear here after the first send.</p> : null}
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <details key={campaign.id} className="group rounded-2xl border border-[#E5E5E5] p-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{campaign.subject}</p>
                      <p className="mt-1 text-xs text-[#666666]">{formatDate(campaign.created_at)} · {campaign.recipients.length} recipients</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#FFF4CC] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">{statusLabel(campaign.status)}</span>
                  </div>
                </summary>
                <div className="mt-4 border-t border-[#EEEEEE] pt-3">
                  {campaign.recipients.some((recipient) => canRetryFailedRecipient(recipient.status)) ? (
                    <button
                      type="button"
                      disabled={retryingCampaignId === campaign.id}
                      onClick={() => void retryFailedRecipients(campaign)}
                      className="mb-3 rounded-xl border border-[#E5E5E5] px-3 py-2 text-xs font-semibold hover:bg-[#FFFBF5] disabled:opacity-50"
                    >
                      {retryingCampaignId === campaign.id ? "Retrying…" : `Retry ${campaign.recipients.filter((recipient) => canRetryFailedRecipient(recipient.status)).length} failed recipient(s)`}
                    </button>
                  ) : null}
                  <ul className="space-y-2">
                    {campaign.recipients.map((recipient) => (
                      <li key={recipient.id} className="flex items-start justify-between gap-3 text-xs">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-[#111111]">{recipient.recipient_name || "Student"}</span>
                          <span className="block break-all text-[#666666]">{recipient.recipient_email}</span>
                          {recipient.error_message ? <span className="mt-1 block text-[#8C2D1C]">{recipient.error_message}</span> : null}
                          {recipient.provider_message_id ? <span className="mt-1 block text-[#666666]">Provider ID: {recipient.provider_message_id}</span> : null}
                        </span>
                        <span className="shrink-0 rounded-full border border-[#E5E5E5] px-2 py-1 capitalize">{statusLabel(recipient.status)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>

      {showPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-8" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPreview(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="email-preview-title" className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-[#FFFBF5] shadow-2xl">
            <header className="flex items-center justify-between border-b border-[#E5E5E5] bg-white px-5 py-4">
              <div><h2 id="email-preview-title" className="font-semibold">Branded email preview</h2><p className="text-xs text-[#666666]">Subject: {subject.trim() || "Your message subject"}</p></div>
              <button type="button" autoFocus onClick={() => setShowPreview(false)} aria-label="Close email preview" className="rounded-full border border-[#E5E5E5] p-2"><X size={16} /></button>
            </header>
            {!configuration?.logoReady ? <p role="status" className="border-b border-[#E5D39C] bg-[#FFF9E8] px-5 py-3 text-xs text-[#5B4812]">Preview uses the branded text fallback. Configure FIRST_PRINCIPLES_EMAIL_LOGO_URL with a public HTTPS URL for the real logo in production email.</p> : null}
            <iframe title="Rendered First Principles email" srcDoc={previewHtml} sandbox="" className="min-h-[65vh] w-full flex-1 border-0 bg-[#FFFBF5]" />
          </section>
        </div>
      ) : null}
    </div>
  );
}
