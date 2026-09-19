"use client";

import { X } from "lucide-react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/35 p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_24px_80px_rgba(17,17,17,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Confirm action</div>
            <h3 className="mt-2 font-serif text-3xl text-[#111111]">{title}</h3>
          </div>
          <button type="button" onClick={onCancel} className="rounded-full border border-[#E5E5E5] p-2 text-[#666666] hover:text-[#111111]" aria-label="Close confirmation">
            <X size={14} />
          </button>
        </div>

        {description ? <p className="mt-4 text-sm leading-6 text-[#666666]">{description}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111] hover:border-[#111111]">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB]">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
