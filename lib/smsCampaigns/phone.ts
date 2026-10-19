export type PhoneNormalization =
  | { ok: true; e164: string; display: string }
  | { ok: false; reason: "missing" | "invalid" | "ambiguous" };

function removeGhanaFormatting(value: string): string {
  return value.trim().replace(/[\s().-]/g, "");
}

export function normalizeGhanaSmsNumber(value: unknown): PhoneNormalization {
  if (typeof value !== "string" || !value.trim()) return { ok: false, reason: "missing" };
  const cleaned = removeGhanaFormatting(value);
  let nationalDigits: string;

  if (/^0[25]\d{8}$/.test(cleaned)) {
    nationalDigits = cleaned.slice(1);
  } else {
    const international = cleaned.match(/^(?:\+233|00233|233)(0?)([25]\d{8})$/);
    if (international) {
      // Ghana's trunk prefix is omitted internationally, but imported records
      // sometimes retain it after the explicit +233/233 country code.
      nationalDigits = international[2];
    } else if (/^[+]\d{8,15}$/.test(cleaned) || /^\d{11,15}$/.test(cleaned)) {
      return { ok: false, reason: "ambiguous" };
    } else {
      return { ok: false, reason: "invalid" };
    }
  }

  const e164 = `+233${nationalDigits}`;
  return { ok: true, e164, display: `0${nationalDigits}` };
}

export function normalizeSmsRecipientNumber(value: unknown): PhoneNormalization {
  const ghana = normalizeGhanaSmsNumber(value);
  if (ghana.ok || ghana.reason === "missing" || ghana.reason === "invalid") return ghana;
  const input = typeof value === "string" ? value.trim().replace(/[\s().-]/g, "") : "";
  if (/^\+[1-9]\d{7,14}$/.test(input)) return { ok: true, e164: input, display: input };
  return { ok: false, reason: "ambiguous" };
}

export type SmsRecipientCandidate = {
  studentId: string;
  fullName: string;
  phoneNumber: string | null;
  consentStatus: "unknown" | "opted_in" | "opted_out";
};

export type SmsRecipientResolution = {
  recipients: Array<{ studentId: string; fullName: string; phoneNumber: string }>;
  excluded: Array<{ studentId: string; fullName: string; reason: string }>;
};

export function resolveSmsRecipients(candidates: SmsRecipientCandidate[]): SmsRecipientResolution {
  const recipients: SmsRecipientResolution["recipients"] = [];
  const excluded: SmsRecipientResolution["excluded"] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (candidate.consentStatus !== "opted_in") {
      excluded.push({
        studentId: candidate.studentId,
        fullName: candidate.fullName,
        reason: candidate.consentStatus === "opted_out" ? "SMS opted out" : "SMS consent not recorded",
      });
      continue;
    }
    const phone = normalizeGhanaSmsNumber(candidate.phoneNumber);
    if (!phone.ok) {
      excluded.push({
        studentId: candidate.studentId,
        fullName: candidate.fullName,
        reason: phone.reason === "missing"
          ? "No phone number"
          : phone.reason === "ambiguous"
            ? "International country code is ambiguous"
            : "Invalid Ghana mobile number",
      });
      continue;
    }
    if (seen.has(phone.e164)) {
      excluded.push({ studentId: candidate.studentId, fullName: candidate.fullName, reason: "Duplicate phone number in this campaign" });
      continue;
    }
    seen.add(phone.e164);
    recipients.push({ studentId: candidate.studentId, fullName: candidate.fullName, phoneNumber: phone.e164 });
  }
  return { recipients, excluded };
}
