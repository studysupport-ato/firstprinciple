"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Flag, X } from "lucide-react";

import { submitFlagAction } from "@/lib/flags/actions";
import { FLAG_REASONS, type FlagTarget } from "@/lib/flags/shared";

/** Keys flagged in this tab, so the button keeps showing "Flagged" while the student moves around. */
const flaggedThisSession = new Set<string>();

type Tone = "light" | "dark";

/**
 * A "Flag" button and the panel it opens. Pass one target, or several `scopes`
 * (e.g. "This video" / "Whole playlist") to let the student choose what is wrong.
 */
export function FlagButton({
  target,
  scopes,
  tone = "light",
  compact = false,
  label = "Flag",
}: {
  target?: FlagTarget;
  scopes?: Array<{ label: string; target: FlagTarget }>;
  tone?: Tone;
  compact?: boolean;
  label?: string;
}) {
  const options = scopes?.length ? scopes : target ? [{ label: "", target }] : [];
  const [open, setOpen] = useState(false);
  const [scopeIndex, setScopeIndex] = useState(0);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const [, force] = useState(0);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const firstReason = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => firstReason.current?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
    };
  }, [open]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(false), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!options.length) return null;
  const current = options[Math.min(scopeIndex, options.length - 1)].target;
  const flagged = options.some((option) => flaggedThisSession.has(option.target.key));
  const reasons = FLAG_REASONS[current.type];

  function openPanel() {
    setScopeIndex(0);
    setReason(null);
    setNote("");
    setError(null);
    setOpen(true);
  }

  async function send() {
    if (!reason) {
      setError("Pick what is wrong.");
      return;
    }
    setSending(true);
    setError(null);
    const result = await submitFlagAction({ ...current, reason, note: note.trim() || undefined });
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    flaggedThisSession.add(current.key);
    setOpen(false);
    setToast(true);
    force((value) => value + 1);
  }

  const buttonTone =
    tone === "dark"
      ? flagged
        ? "border-[#F09A73] bg-[#F09A73] text-[#1A1814]"
        : "border-[#F09A73] bg-[#F09A73]/10 text-[#FFC4A8] hover:bg-[#F09A73]/20"
      : flagged
        ? "border-[#B4471F] bg-[#B4471F] text-white"
        : "border-[#B4471F] bg-[#FFF1EA] text-[#8F3414] hover:bg-[#FFE4D6]";

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        aria-haspopup="dialog"
        aria-label={flagged ? "Flagged. Flag again" : `${label}: report a problem`}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border-[1.5px] font-sans font-bold transition ${compact ? "h-7 px-2.5 text-xs" : "h-10 px-3.5 text-[13px]"} ${buttonTone}`}
      >
        <Flag size={compact ? 12 : 14} strokeWidth={2.4} fill={flagged ? "currentColor" : "none"} aria-hidden />
        <span className={compact ? "hidden sm:inline" : ""}>{flagged ? "Flagged" : label}</span>
      </button>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-end justify-center bg-[rgba(10,14,22,0.55)] sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="flex max-h-[92dvh] w-full max-w-[440px] flex-col gap-4 overflow-y-auto rounded-t-[22px] bg-[#FBF8F0] px-[18px] pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 font-sans text-[#1A1814] shadow-[0_-12px_40px_rgba(0,0,0,0.35)] sm:rounded-[22px] sm:p-[22px]"
              >
                <span aria-hidden className="mx-auto h-1 w-10 rounded bg-[#D6D0C4] sm:hidden" />
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 id={titleId} className="text-[22px] font-extrabold leading-tight">
                      {options.length > 1 ? "Flag" : `Flag this ${current.type === "lesson" ? "step" : current.type}`}
                    </h2>
                    <p className="mt-1 text-[13.5px] text-[#5C564B]">
                      {current.location}
                      {current.title && !current.location.includes(current.title) ? ` · ${current.title}` : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#5C564B] hover:bg-black/5">
                    <X size={18} />
                  </button>
                </div>

                {options.length > 1 ? (
                  <fieldset>
                    <legend className="mb-2 text-[14px] font-bold">What are you flagging?</legend>
                    <div className="flex gap-1 rounded-full bg-[#ECE7DA] p-1">
                      {options.map((option, index) => (
                        <button
                          key={option.label}
                          type="button"
                          aria-pressed={index === scopeIndex}
                          onClick={() => {
                            setScopeIndex(index);
                            setReason(null);
                          }}
                          className={`min-h-10 flex-1 rounded-full text-[13.5px] font-bold transition ${index === scopeIndex ? "bg-[#1A1814] text-[#F6EFDC]" : "text-[#1A1814]"}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : null}

                <fieldset>
                  <legend className="mb-2 text-[14px] font-bold">What&apos;s wrong?</legend>
                  <div className="flex flex-col gap-1.5">
                    {reasons.map((item, index) => {
                      const on = reason === item;
                      return (
                        <button
                          key={item}
                          ref={index === 0 ? firstReason : undefined}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setReason(item)}
                          className={`flex min-h-11 items-center gap-2.5 rounded-xl border-[1.5px] px-3.5 text-left text-[14px] font-semibold transition ${on ? "border-[#1A1814] bg-[#1A1814] text-[#F6EFDC]" : "border-[#D6D0C4] bg-white hover:border-[#8A8272]"}`}
                        >
                          <span aria-hidden className={`h-3.5 w-3.5 shrink-0 rounded-full ${on ? "border-4 border-[#E9BC3A] bg-[#1A1814]" : "border-[1.5px] border-[#8A8272]"}`} />
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <label className="flex flex-col gap-1.5 text-[14px] font-bold">
                  <span>
                    Tell us more <span className="text-[12.5px] font-medium text-[#6B6457]">Optional{current.type === "video" || current.type === "playlist" ? ". A better video link is welcome." : ""}</span>
                  </span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder="What did you expect to see?"
                    className="resize-none rounded-xl border border-[#CFC7B6] bg-white px-3 py-2.5 text-[14.5px] font-normal leading-relaxed text-[#1A1814] placeholder:text-[#8A8272] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9BC3A]"
                  />
                </label>

                {error ? <p role="alert" className="text-[13.5px] font-semibold text-[#B4471F]">{error}</p> : null}

                <div className="flex gap-2.5">
                  <button type="button" onClick={() => setOpen(false)} className="h-12 flex-1 rounded-full border-[1.5px] border-[#1A1814] text-[15px] font-bold">
                    Cancel
                  </button>
                  <button type="button" onClick={() => void send()} disabled={sending} className="h-12 flex-[2] rounded-full bg-[#E9BC3A] text-[15px] font-extrabold text-[#1A1814] transition hover:bg-[#F2CC5C] disabled:opacity-60">
                    {sending ? "Sending…" : "Send flag"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {mounted && toast
        ? createPortal(
            <div role="status" className="fixed inset-x-3.5 bottom-24 z-[210] mx-auto flex max-w-[420px] items-start gap-3 rounded-[18px] bg-[#1A1814] px-[18px] py-4 font-sans text-[#F6EFDC] shadow-[0_12px_30px_rgba(0,0,0,0.4)]">
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#E9BC3A] text-[#1A1814]">
                <Check size={16} strokeWidth={3} aria-hidden />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <b className="text-[15px]">Thanks, flag sent</b>
                <span className="text-[13.5px] leading-snug text-[#F6EFDC]/80">The team will check it. Signed-in students are told when it is fixed.</span>
              </span>
              <button type="button" onClick={() => setToast(false)} aria-label="Dismiss" className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10">
                <X size={15} />
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
