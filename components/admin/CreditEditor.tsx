"use client";

import { useEffect, useState } from "react";

/**
 * Credit for the person who wrote or compiled a course's materials.
 * Students see it on the course tile and at the top of the course.
 */
export function CreditEditor({ value, busy, onSave }: { value?: string; busy: boolean; onSave: (credit: string) => void }) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);
  const changed = draft.trim() !== (value ?? "").trim();

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[#3A3428] p-4">
      <div className="text-[15px] font-bold">Credit</div>
      <p className="text-sm text-[#C9BFA6]">Who wrote or compiled these materials. Students see it on the course tile, e.g. &quot;Compiled by Ama Mensah, EEE class of 2027&quot;.</p>
      <div className="flex flex-wrap gap-2.5">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={140}
          placeholder="Compiled by …"
          aria-label="Credit"
          className="min-h-[46px] w-full flex-[3_1_260px] rounded-xl border border-[#5A4F3A] bg-[#26231C] px-3.5 text-base text-[#F6EFDC] placeholder:text-[#8F8671] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9BC3A]"
        />
        <button
          type="button"
          disabled={busy || !changed}
          onClick={() => onSave(draft.trim())}
          className="min-h-[46px] rounded-full bg-[#8F6500] px-6 text-base font-bold text-[#F6EFDC] transition hover:brightness-110 disabled:opacity-50"
        >
          Save credit
        </button>
      </div>
    </div>
  );
}
