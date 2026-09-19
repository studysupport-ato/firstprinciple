import { AlertTriangle, RefreshCcw } from "lucide-react";

export function AdminErrorState({ title = "Something went wrong", description = "The admin section could not be loaded.", onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-[28px] border border-[#FECACA] bg-[#FEF2F2] p-8 text-center shadow-[0_10px_24px_rgba(17,17,17,0.02)]">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#E11D48]">
        <AlertTriangle size={22} />
      </div>
      <h3 className="font-serif text-3xl text-[#111111]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[#666666]">{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]"
        >
          <RefreshCcw size={15} />
          Try again
        </button>
      ) : null}
    </div>
  );
}
