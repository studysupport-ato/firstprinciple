import Link from "next/link";
import { Plus } from "lucide-react";

interface AdminEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function AdminEmptyState({ title, description, actionLabel, actionHref }: AdminEmptyStateProps) {
  const content = (
    <div className="rounded-[28px] border border-dashed border-[#D9D9D9] bg-white p-10 text-center shadow-[0_10px_24px_rgba(17,17,17,0.02)]">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F7F7F8] text-[#111111]">
        <Plus size={20} />
      </div>
      <h3 className="font-serif text-3xl text-[#111111]">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#666666]">{description}</p>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]"
        >
          <Plus size={15} />
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );

  return content;
}
