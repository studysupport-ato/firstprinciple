"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, RefreshCw, Search, Send, Trash2, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getAdminStudentRecipientPageAction } from "@/lib/student/adminDirectoryActions";
import type { StudentRecipientPage } from "@/lib/student/adminDirectory";
import {
  getSmsCampaignConfigurationAction,
  getSmsCampaignHistoryAction,
  getSmsStudentPreferencesAction,
  deleteSmsCampaignsAction,
  retryFailedSmsRecipientsAction,
  sendSmsCampaignAction,
} from "@/lib/smsCampaigns/adminActions";
import { normalizeGhanaSmsNumber, normalizeSmsRecipientNumber } from "@/lib/smsCampaigns/phone";
import { estimateSmsSegments } from "@/lib/smsCampaigns/segments";
import { isSmsCampaignFormReady, SMS_MESSAGE_MAX_LENGTH } from "@/lib/smsCampaigns/validation";
import { canRetrySmsRecipient } from "@/lib/smsCampaigns/status";
import type { SmsAdminStudent, SmsCampaign, SmsConsentStatus, SmsPublicConfiguration } from "@/lib/smsCampaigns/types";

const PAGE_SIZE = 25;

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

function ineligibleReason(student: SmsAdminStudent): string | null {
  if (student.smsConsentStatus === "opted_out") return "Opted out — suppressed";
  if (student.smsConsentStatus !== "opted_in") return "SMS consent not recorded";
  if (student.phoneStatus === "missing") return "Phone number missing";
  if (student.phoneStatus === "invalid") return "Invalid Ghana mobile number";
  if (student.phoneStatus === "ambiguous") return "International country code is ambiguous";
  if (student.phoneStatus === "duplicate") return "Duplicate number on this page";
  return null;
}

export default function AdminSmsPage() {
  const [directory, setDirectory] = useState<StudentRecipientPage | null>(null);
  const [preferences, setPreferences] = useState<Map<string, { status: SmsConsentStatus; source: string | null; reference: string | null; recordedAt: string | null }>>(new Map());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recipientMode, setRecipientMode] = useState<"all" | "custom" | null>(null);
  const [manualPhoneInput, setManualPhoneInput] = useState("");
  const [manualPhones, setManualPhones] = useState<string[]>([]);
  const [manualConsentConfirmed, setManualConsentConfirmed] = useState(false);
  const [manualConsentReference, setManualConsentReference] = useState("");
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, SmsAdminStudent>>(new Map());
  const [message, setMessage] = useState("");
  const [purpose, setPurpose] = useState<"educational" | "operational">("educational");
  const [purposeConfirmed, setPurposeConfirmed] = useState(false);
  const [configuration, setConfiguration] = useState<SmsPublicConfiguration | null>(null);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deletingCampaigns, setDeletingCampaigns] = useState(false);
  const [sending, setSending] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const directoryStudents = directory?.students ?? [];
  const segments = useMemo(() => estimateSmsSegments(message), [message]);
  const smsStudents: SmsAdminStudent[] = useMemo(() => {
    const records = directoryStudents.map((student) => {
      const preference = preferences.get(student.studentId);
      const phone = normalizeGhanaSmsNumber(student.phoneNumber);
      return {
        studentId: student.studentId,
        fullName: student.fullName,
        phoneNumber: student.phoneNumber,
        phoneStatus: phone.ok ? "eligible" as const : phone.reason,
        smsConsentStatus: preference?.status ?? "unknown",
        consentSource: preference?.source ?? null,
        consentReference: preference?.reference ?? null,
        consentRecordedAt: preference?.recordedAt ?? null,
      };
    });
    const seen = new Set<string>();
    return records.map((student) => {
      if (student.phoneStatus !== "eligible") return student;
      const phone = normalizeGhanaSmsNumber(student.phoneNumber);
      if (!phone.ok) return student;
      if (seen.has(phone.e164)) return { ...student, phoneStatus: "duplicate" as const };
      seen.add(phone.e164);
      return student;
    });
  }, [directoryStudents, preferences]);
  const currentPageEligible = smsStudents.filter((student) =>
    student.smsConsentStatus === "opted_in" && student.phoneStatus === "eligible",
  );
  const selectedOnPage = currentPageEligible.filter((student) => selected.has(student.studentId)).length;
  const allPageSelected = currentPageEligible.length > 0 && selectedOnPage === currentPageEligible.length;
  const selectedList = [...selected.values()];
  const sendReady = isSmsCampaignFormReady({
    sending,
    audience: recipientMode,
    selectedStudentCount: selectedList.length,
    manualNumberCount: manualPhones.length,
    message,
    purposeConfirmed,
    manualConsentConfirmed,
    manualConsentReference,
  });

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const result = await getSmsCampaignHistoryAction();
      if (result.ok) {
        setCampaigns(result.data);
        setSelectedCampaignIds((current) => new Set([...current].filter((id) =>
          result.data.some((campaign) =>
            campaign.id === id && campaign.status !== "sending" && campaign.status !== "uncertain",
          ),
        )));
        setHistoryError(null);
      } else setHistoryError(result.error);
    } catch {
      setHistoryError("SMS campaign history could not be loaded.");
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
        .then(async (result) => {
          if (!active) return;
          if (!result.ok) {
            setDirectoryError(result.error);
            return;
          }
          setDirectory(result.data);
          setPage(result.data.page);
          const ids = result.data.students.map((student) => student.studentId);
          if (!ids.length) {
            setPreferences(new Map());
            setDirectoryError(null);
            return;
          }
          const preferenceResult = await getSmsStudentPreferencesAction(ids);
          if (!active) return;
          if (!preferenceResult.ok) {
            setDirectoryError(preferenceResult.error);
            return;
          }
          setPreferences(new Map(preferenceResult.data.map((preference) => [
            preference.studentId,
            {
              status: preference.status,
              source: preference.consentSource,
              reference: preference.consentReference,
              recordedAt: preference.consentRecordedAt,
            },
          ])));
          setDirectoryError(null);
        })
        .catch(() => { if (active) setDirectoryError("SMS recipients could not be loaded."); })
        .finally(() => { if (active) setLoadingStudents(false); });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [page, pickerOpen, search]);

  useEffect(() => {
    let active = true;
    void getSmsCampaignConfigurationAction()
      .then((result) => {
        if (!active) return;
        if (result.ok) setConfiguration(result.data);
        else setConfigurationError(result.error);
      })
      .catch(() => { if (active) setConfigurationError("SMS provider setup status could not be loaded."); });
    void loadHistory();
    return () => { active = false; };
  }, [loadHistory]);

  function selectStudent(student: SmsAdminStudent) {
    if (student.smsConsentStatus !== "opted_in" || student.phoneStatus !== "eligible") return;
    if (!selected.has(student.studentId)) {
      const phone = normalizeGhanaSmsNumber(student.phoneNumber);
      if (phone.ok && [...selected.values()].some((selectedStudent) => {
        const selectedPhone = normalizeGhanaSmsNumber(selectedStudent.phoneNumber);
        return selectedPhone.ok && selectedPhone.e164 === phone.e164;
      })) {
        setSelectionError("That phone number is already selected for another student; it will only receive one SMS.");
        return;
      }
    }
    setSelectionError(null);
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(student.studentId)) next.delete(student.studentId);
      else next.set(student.studentId, student);
      return next;
    });
  }

  function togglePage() {
    setSelected((current) => {
      const next = new Map(current);
      if (allPageSelected) currentPageEligible.forEach(({ studentId }) => next.delete(studentId));
      else {
        const selectedNumbers = new Set([...next.values()].map((student) => {
          const phone = normalizeGhanaSmsNumber(student.phoneNumber);
          return phone.ok ? phone.e164 : "";
        }).filter(Boolean));
        currentPageEligible.forEach((student) => {
          const phone = normalizeGhanaSmsNumber(student.phoneNumber);
          if (phone.ok && !selectedNumbers.has(phone.e164)) {
            next.set(student.studentId, student);
            selectedNumbers.add(phone.e164);
          }
        });
      }
      return next;
    });
    setSelectionError(null);
  }

  function addManualPhones() {
    const entries = manualPhoneInput.split(/[,\n;]+/).map((phone) => phone.trim()).filter(Boolean);
    const normalized = entries.map((phone) => normalizeSmsRecipientNumber(phone));
    if (!entries.length || normalized.some((phone) => !phone.ok)) {
      setErrorMessage("Use a valid Ghana number or international E.164 format, such as +14155552671.");
      return;
    }
    setManualPhones((current) => [...new Set([...current, ...normalized.flatMap((phone) => phone.ok ? [phone.e164] : [])])]);
    setManualPhoneInput("");
    setErrorMessage(null);
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setErrorMessage(null);
    if (recipientMode === null && !selected.size && !manualPhones.length) {
      setErrorMessage("Choose All Users, select custom students, or enter a phone number.");
      return;
    }
    if (manualPhones.length && (!manualConsentConfirmed || !manualConsentReference.trim())) {
      setErrorMessage("Confirm consent for each manually entered recipient and provide an evidence reference.");
      return;
    }
    const audienceLabel = recipientMode === "all"
      ? `all opted-in students${manualPhones.length ? ` plus ${manualPhones.length} manual recipient${manualPhones.length === 1 ? "" : "s"}` : ""}`
      : `${selected.size + manualPhones.length} recipient${selected.size + manualPhones.length === 1 ? "" : "s"}`;
    if (!window.confirm(`Send this SMS to ${audienceLabel}?`)) return;
    const key = requestKey ?? crypto.randomUUID();
    setRequestKey(key);
    setSending(true);
    try {
      const result = await sendSmsCampaignAction({
        audience: recipientMode ?? "custom",
        studentIds: selectedList.map((student) => student.studentId),
        manualNumbers: manualPhones,
        manualConsentConfirmed,
        manualConsentReference,
        message,
        purpose,
        purposeConfirmed,
        idempotencyKey: key,
      });
      if (result.ok) {
        const counts = result.data;
        setNotice(counts.replayed
          ? "This request was already recorded; no duplicate SMS request was submitted."
          : `Campaign ${statusLabel(counts.status)}: ${counts.accepted} accepted, ${counts.delivered} delivered, ${counts.failed} failed, ${counts.uncertain} uncertain.${counts.excluded.length ? ` ${counts.excluded.length} records were excluded.` : ""}`);
        setRequestKey(null);
        if (!counts.replayed) {
          setSelected(new Map());
          setRecipientMode(null);
          setManualPhones([]);
          setManualConsentConfirmed(false);
          setManualConsentReference("");
        }
        await loadHistory();
      } else {
        setErrorMessage(result.error);
        if (!result.campaignId && !result.uncertain) setRequestKey(null);
        await loadHistory();
      }
    } catch {
      setErrorMessage("The send result could not be confirmed. Refresh history and reconcile with Arkesel before starting another campaign.");
    } finally {
      setSending(false);
    }
  }

  async function retryFailed(campaign: SmsCampaign) {
    const count = campaign.recipients.filter((recipient) => canRetrySmsRecipient(recipient.status, recipient.attempt_count)).length;
    if (!count || !window.confirm(`Retry ${count} definitely failed recipient(s)? Uncertain submissions are not retried.`)) return;
    setRetrying(campaign.id);
    setErrorMessage(null);
    try {
      const result = await retryFailedSmsRecipientsAction(campaign.id);
      if (result.ok) setNotice(`Retry finished: ${result.data.accepted} accepted, ${result.data.delivered} delivered, ${result.data.failed} failed, ${result.data.uncertain} uncertain.`);
      else setErrorMessage(result.error);
      await loadHistory();
    } catch {
      setErrorMessage("Retry status could not be confirmed. Reconcile with Arkesel before further action.");
      await loadHistory();
    } finally {
      setRetrying(null);
    }
  }

  function toggleVisibleCampaigns() {
    const deletable = campaigns.filter((campaign) => campaign.status !== "sending" && campaign.status !== "uncertain");
    const allSelected = deletable.length > 0 && deletable.every((campaign) => selectedCampaignIds.has(campaign.id));
    setSelectedCampaignIds((current) => {
      const next = new Set(current);
      for (const campaign of deletable) {
        if (allSelected) next.delete(campaign.id);
        else next.add(campaign.id);
      }
      return next;
    });
  }

  async function deleteSelectedCampaigns() {
    const ids = [...selectedCampaignIds];
    if (!ids.length || !window.confirm(
      `Delete ${ids.length} selected campaign history item${ids.length === 1 ? "" : "s"}? This removes the app's tracking history; it cannot recall SMS messages already sent.`,
    )) return;
    setDeletingCampaigns(true);
    setErrorMessage(null);
    setNotice(null);
    try {
      const result = await deleteSmsCampaignsAction(ids);
      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }
      setSelectedCampaignIds(new Set());
      setNotice(`${result.data.deleted} campaign history item${result.data.deleted === 1 ? "" : "s"} deleted.`);
      await loadHistory();
    } catch {
      setErrorMessage("Campaign history could not be deleted. Refresh the history before retrying.");
      await loadHistory();
    } finally {
      setDeletingCampaigns(false);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <AdminPageHeader title="SMS" description="Send consent-based educational SMS messages with Arkesel and review delivery status." />
      {configurationError ? <div role="alert" className="rounded-2xl border border-[#F1C7C1] bg-[#FFF7F5] p-4 text-sm text-[#8C2D1C]">{configurationError}</div> : null}
      {configuration && (!configuration.apiReady || !configuration.senderReady || !configuration.callbackReady || !configuration.webhookReady) ? (
        <div role="status" className="rounded-2xl border border-[#E5D39C] bg-[#FFF9E8] p-4 text-sm text-[#5B4812]">
          <p className="font-semibold">SMS setup needs attention</p>
          <p className="mt-1">Configured sender ID: {configuration.senderName}. It must be approved by Arkesel and at most 11 characters.</p>
          <p className="mt-1">Configure on the server: {configuration.missing.join(", ")}.</p>
        </div>
      ) : null}
      {errorMessage ? <div role="alert" className="rounded-xl border border-[#F1C7C1] bg-[#FFF7F5] p-3 text-sm text-[#8C2D1C]">{errorMessage}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-[#CDE8D5] bg-[#F2FBF4] p-3 text-sm text-[#215B32]">{notice}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <section className="rounded-3xl border border-[#E5E5E5] bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF4CC]"><MessageSquare size={18} /></div>
            <div><h2 className="text-lg font-semibold">Compose SMS</h2><p className="text-sm text-[#666666]">For legitimate educational or operational updates.</p></div>
          </div>
          <form onSubmit={handleSend} className="space-y-5">
            <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFBF5] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-semibold">Recipients · {recipientMode === "all" ? "All eligible" : `${selected.size} custom selected`}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setRecipientMode("all"); setSelected(new Map()); setPickerOpen(false); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${recipientMode === "all" ? "border-[#111111] bg-[#FFF4CC]" : "border-[#E5E5E5] bg-white"}`}>All Users</button>
                  <button type="button" onClick={() => { setRecipientMode("custom"); setPickerOpen(true); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${recipientMode === "custom" ? "border-[#111111] bg-[#FFF4CC]" : "border-[#E5E5E5] bg-white"}`}>Custom Users</button>
                </div>
              </div>
              <p className="mt-2 text-xs text-[#666666]">
                {recipientMode === "all"
                  ? "The server will resolve every valid number with recorded SMS opt-in. No directory is loaded in the browser."
                  : "Open the paginated picker to search and choose students. Only this page is fetched at a time."}
              </p>
              {selectionError ? <p role="status" className="mt-2 rounded-lg border border-[#E5D39C] bg-[#FFF9E8] p-2 text-xs text-[#5B4812]">{selectionError}</p> : null}
              {pickerOpen ? (
                <div role="dialog" aria-modal="true" aria-label="Select custom SMS recipients" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 sm:p-6">
                  <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-[#E5E5E5] bg-white p-5 shadow-xl sm:p-7">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div><h3 className="text-lg font-semibold">Choose custom students</h3><p className="text-sm text-[#666666]">Only opted-in students with valid Ghana mobile numbers can be selected.</p></div>
                      <button type="button" onClick={() => setPickerOpen(false)} aria-label="Close recipient picker" className="rounded-full p-2 hover:bg-[#F7F7F8]"><X size={18} /></button>
                    </div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{selected.size} selected</span>
                      <button type="button" onClick={togglePage} disabled={loadingStudents || !currentPageEligible.length} className="text-xs underline decoration-[#FFBE00] underline-offset-4 disabled:opacity-40">{allPageSelected ? "Deselect eligible page" : "Select eligible page"}</button>
                    </div>
                    <label className="relative mb-2 block">
                      <Search size={15} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
                      <span className="sr-only">Search students by name or phone</span>
                      <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or phone..." className="w-full rounded-xl border border-[#E5E5E5] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#111111]" />
                    </label>
                    {directoryError ? <p role="alert" className="mb-2 rounded-lg bg-[#FFF7F5] p-3 text-sm text-[#8C2D1C]">{directoryError}</p> : null}
                    <div className="min-h-40 flex-1 divide-y divide-[#EEEEEE] overflow-y-auto rounded-xl border border-[#E5E5E5] bg-white">
                      {loadingStudents ? <p className="p-4 text-sm text-[#666666]">Loading this page…</p> : null}
                      {!loadingStudents && !directoryError && !smsStudents.length ? <p className="p-4 text-sm text-[#666666]">No matching students.</p> : null}
                      {smsStudents.map((student) => {
                        const reason = ineligibleReason(student);
                        const eligible = !reason && student.smsConsentStatus === "opted_in";
                        return <div key={student.studentId} className="flex items-start gap-3 p-3"><input type="checkbox" aria-label={`Select ${student.fullName}`} checked={selected.has(student.studentId)} disabled={!eligible} onChange={() => selectStudent(student)} className="mt-1 accent-[#111111] disabled:opacity-35" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{student.fullName || "Name unavailable"}</p><p className="text-xs text-[#666666]">{student.phoneNumber || "No phone number provided"}</p>{reason ? <p className="mt-1 text-xs text-[#8C2D1C]">{reason}</p> : <p className="mt-1 text-xs text-[#2E6D3D]">Opt-in recorded · {student.consentSource}</p>}</div></div>;
                      })}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-[#666666]">
                      <span>Page {page}</span>
                      <div className="flex gap-2">
                        <button type="button" disabled={loadingStudents || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Previous SMS recipient page" className="rounded-lg border border-[#E5E5E5] p-2 disabled:opacity-40"><ChevronLeft size={15} /></button>
                        <button type="button" disabled={loadingStudents || !directory?.hasNextPage} onClick={() => setPage((value) => value + 1)} aria-label="Next SMS recipient page" className="rounded-lg border border-[#E5E5E5] p-2 disabled:opacity-40"><ChevronRight size={15} /></button>
                      </div>
                    </div>
                    <button type="button" onClick={() => setPickerOpen(false)} className="mt-4 self-end rounded-xl bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white">Done selecting</button>
                  </div>
                </div>
              ) : null}
            </div>

            {selectedList.length ? (
              <div className="rounded-2xl border border-[#E5E5E5] p-4">
                <p className="mb-2 text-sm font-semibold">Review selected recipients ({selectedList.length} unique phone number{selectedList.length === 1 ? "" : "s"})</p>
                <ul className="max-h-32 space-y-1 overflow-auto text-xs text-[#666666]">
                  {selectedList.map((student) => {
                    const phone = normalizeGhanaSmsNumber(student.phoneNumber);
                    return <li key={student.studentId}>{student.fullName} · {phone.ok ? phone.e164 : "Needs phone correction"}</li>;
                  })}
                </ul>
              </div>
            ) : null}

            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Additional phone numbers</span>
                <span className="flex gap-2">
                  <input type="text" value={manualPhoneInput} onChange={(event) => setManualPhoneInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addManualPhones(); } }} placeholder="020 853 5111 or +14155552671" className="min-w-0 flex-1 rounded-xl border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#111111]" />
                  <button type="button" onClick={addManualPhones} className="rounded-xl border border-[#E5E5E5] px-3 text-xs font-semibold">Add</button>
                </span>
                <span className="mt-1 block text-xs font-normal text-[#666666]">Ghana local numbers are normalized; other countries must use +country-code format.</span>
              </label>
              {manualPhones.length ? (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold">Manual recipients ({manualPhones.length})</p>
                  <ul className="flex flex-wrap gap-2">{manualPhones.map((phone) => <li key={phone} className="flex items-center gap-2 rounded-full bg-[#FFFBF5] px-3 py-1 text-xs">{phone}<button type="button" aria-label={`Remove ${phone}`} onClick={() => setManualPhones((current) => current.filter((item) => item !== phone))}><X size={13} /></button></li>)}</ul>
                  <label className="mt-3 flex items-start gap-2 text-xs text-[#555555]">
                    <input type="checkbox" checked={manualConsentConfirmed} onChange={(event) => setManualConsentConfirmed(event.target.checked)} className="mt-0.5 accent-[#111111]" />
                    <span>I confirm each manually entered number has consented to receive this non-promotional educational or operational SMS.</span>
                  </label>
                  <label className="mt-3 block text-xs font-medium">
                    Consent evidence reference
                    <input required={manualPhones.length > 0} maxLength={500} value={manualConsentReference} onChange={(event) => setManualConsentReference(event.target.value)} placeholder="e.g. permission received 18 Oct 2026 (call log ref)" className="mt-1.5 w-full rounded-xl border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#111111]" />
                  </label>
                </div>
              ) : null}
            </div>

            {selectionError ? <p role="status" className="rounded-xl border border-[#E5D39C] bg-[#FFF9E8] p-3 text-sm text-[#5B4812]">{selectionError}</p> : null}
            <label className="block text-sm font-medium">Message purpose
              <select value={purpose} onChange={(event) => setPurpose(event.target.value as typeof purpose)} className="mt-1.5 w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5">
                <option value="educational">Educational update</option>
                <option value="operational">Operational announcement</option>
              </select>
              <span className="mt-1 block text-xs font-normal text-[#666666]">Promotional messages are not supported by this campaign tool.</span>
            </label>
            <label className="flex items-start gap-2 text-xs text-[#555555]">
              <input required type="checkbox" checked={purposeConfirmed} onChange={(event) => setPurposeConfirmed(event.target.checked)} className="mt-0.5 accent-[#111111]" />
              <span>I confirm this is a legitimate educational or operational message, not promotional. Student recipients must have recorded opt-in; manually entered recipients require the separate consent confirmation and evidence reference.</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Message</span>
              <textarea required maxLength={SMS_MESSAGE_MAX_LENGTH} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a concise educational update…" className="w-full resize-y rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#111111]" />
              <span className="mt-1 block text-right text-xs text-[#666666]">{Array.from(message).length} characters · {message.length}/{SMS_MESSAGE_MAX_LENGTH} storage limit</span>
            </label>
            <div className={`rounded-xl border p-3 text-sm ${segments.segments > 1 ? "border-[#E5D39C] bg-[#FFF9E8] text-[#5B4812]" : "border-[#E5E5E5] bg-[#FAFAFA] text-[#555555]"}`}>
              <p className="font-semibold">{segments.encoding} · estimated {segments.segments} segment{segments.segments === 1 ? "" : "s"} per recipient</p>
              <p className="mt-1 text-xs">Estimate only; Arkesel or network routing may segment differently. {segments.encoding === "GSM-7" ? `${segments.characters}/${segments.singleMessageLimit} septets for one segment; concatenated segments carry up to ${segments.charactersPerSegment} septets each.` : `${segments.characters}/${segments.singleMessageLimit} UCS-2 code units for one segment; concatenated segments carry up to ${segments.charactersPerSegment} units each. Emoji may occupy two code units.`}</p>
              {segments.segments > 1 ? <p className="mt-1 text-xs font-medium">Long messages use multiple segments. No exact cost estimate is configured.</p> : null}
            </div>
            <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] p-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#666666]">Plain-text preview · sender ID: {configuration?.senderName ?? "Loading"}</p>
              <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.trim() || "Your SMS message will appear here."}</p>
              <p className="mt-2 text-xs text-[#666666]">No rich formatting; the message is sent as plain text.</p>
            </div>
            <button type="submit" disabled={!sendReady} className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-3 text-sm font-semibold text-white hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-45">
              {sending ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
              {sending ? "Submitting to Arkesel…" : requestKey ? "Check campaign status" : "Review and send"}
            </button>
            {!sendReady && !sending ? (
              <p role="status" className="text-xs text-[#666666]">
                {!recipientMode && !selectedList.length && !manualPhones.length
                  ? "Select students or add a manual phone number."
                  : manualPhones.length && (!manualConsentConfirmed || !manualConsentReference.trim())
                    ? "Confirm manual-recipient consent and enter its evidence reference."
                    : !purposeConfirmed
                      ? "Confirm the message is a legitimate educational or operational update."
                      : !message.trim()
                        ? "Enter a message to continue."
                        : null}
              </p>
            ) : null}
          </form>
        </section>

        <section className="rounded-3xl border border-[#E5E5E5] bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div><h2 className="text-lg font-semibold">SMS campaign history</h2><p className="text-sm text-[#666666]">Provider acceptance is not delivery confirmation.</p></div>
            <div className="flex items-center gap-2">
              {campaigns.length ? <button type="button" onClick={toggleVisibleCampaigns} disabled={!campaigns.some((campaign) => campaign.status !== "sending" && campaign.status !== "uncertain")} className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-semibold disabled:opacity-45">{campaigns.filter((campaign) => campaign.status !== "sending" && campaign.status !== "uncertain").length > 0 && campaigns.filter((campaign) => campaign.status !== "sending" && campaign.status !== "uncertain").every((campaign) => selectedCampaignIds.has(campaign.id)) ? "Deselect all" : "Select all"}</button> : null}
              <button type="button" onClick={() => void deleteSelectedCampaigns()} disabled={!selectedCampaignIds.size || deletingCampaigns} className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6C4BF] px-3 py-2 text-xs font-semibold text-[#8C2D1C] disabled:cursor-not-allowed disabled:opacity-45">
                <Trash2 size={14} />{deletingCampaigns ? "Deleting…" : `Delete${selectedCampaignIds.size ? ` (${selectedCampaignIds.size})` : ""}`}
              </button>
              <button type="button" onClick={() => void loadHistory()} aria-label="Refresh SMS campaign history" className="rounded-full border border-[#E5E5E5] p-2"><RefreshCw size={15} /></button>
            </div>
          </div>
          {historyError ? <p role="alert" className="rounded-xl bg-[#FFF7F5] p-3 text-sm text-[#8C2D1C]">{historyError}</p> : null}
          {loadingHistory ? <p className="text-sm text-[#666666]">Loading history…</p> : null}
          {!loadingHistory && !historyError && !campaigns.length ? <p className="rounded-2xl border border-dashed border-[#E5E5E5] p-6 text-center text-sm text-[#666666]">SMS campaigns will appear here.</p> : null}
          <div className="space-y-3">
            {campaigns.map((campaign) => {
              const deletable = campaign.status !== "sending" && campaign.status !== "uncertain";
              return <div key={campaign.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  aria-label={`Select SMS campaign from ${dateLabel(campaign.created_at)}`}
                  checked={selectedCampaignIds.has(campaign.id)}
                  disabled={!deletable || deletingCampaigns}
                  onChange={() => setSelectedCampaignIds((current) => {
                    const next = new Set(current);
                    if (next.has(campaign.id)) next.delete(campaign.id);
                    else next.add(campaign.id);
                    return next;
                  })}
                  className="mt-5 accent-[#111111] disabled:opacity-35"
                />
                <details className="min-w-0 flex-1 rounded-2xl border border-[#E5E5E5] p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="line-clamp-2 whitespace-pre-wrap text-sm font-semibold">{campaign.message}</p><p className="mt-1 text-xs text-[#666666]">{dateLabel(campaign.created_at)} · {campaign.recipients.length} recipients · {campaign.sender_name}</p></div>
                      <span className="shrink-0 rounded-full bg-[#FFF4CC] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">{statusLabel(campaign.status)}</span>
                    </div>
                  </summary>
                  <div className="mt-4 border-t border-[#EEEEEE] pt-3">
                    {campaign.recipients.some((recipient) => canRetrySmsRecipient(recipient.status, recipient.attempt_count)) ? <button type="button" disabled={retrying === campaign.id} onClick={() => void retryFailed(campaign)} className="mb-3 rounded-xl border border-[#E5E5E5] px-3 py-2 text-xs font-semibold disabled:opacity-50">{retrying === campaign.id ? "Retrying…" : `Retry ${campaign.recipients.filter((recipient) => canRetrySmsRecipient(recipient.status, recipient.attempt_count)).length} failed recipient(s)`}</button> : null}
                    <ul className="space-y-2">
                      {campaign.recipients.map((recipient) => (
                        <li key={recipient.id} className="flex items-start justify-between gap-3 border-b border-[#F1F1F1] pb-2 text-xs">
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{recipient.recipient_name || "Student"} · {recipient.recipient_phone}</span>
                            {recipient.provider_reference ? <span className="block text-[#666666]">Provider reference: {recipient.provider_reference}</span> : null}
                            <span className="block text-[#666666]">Submission attempts: {recipient.attempt_count}/5</span>
                            {recipient.provider_status ? <span className="block text-[#666666]">Arkesel report: {recipient.provider_status}{recipient.delivery_updated_at ? ` · ${dateLabel(recipient.delivery_updated_at)}` : ""}</span> : null}
                            {recipient.consent_source_snapshot === "admin_attestation" && recipient.consent_reference_snapshot ? <span className="block text-[#666666]">Manual consent evidence: {recipient.consent_reference_snapshot}</span> : null}
                            {recipient.error_message ? <span className="mt-1 block text-[#8C2D1C]">{recipient.error_message}</span> : null}
                          </span>
                          <span className="shrink-0 rounded-full border border-[#E5E5E5] px-2 py-1 capitalize">{statusLabel(recipient.status)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
                {!deletable ? <span className="pt-5 text-[10px] text-[#666666]">Protected</span> : null}
              </div>;
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
