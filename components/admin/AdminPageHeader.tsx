import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Plus } from "lucide-react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actionIcon?: ReactNode;
}

export function AdminPageHeader({
  title,
  description,
  actionLabel,
  actionHref,
  breadcrumbs,
  actionIcon,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-5 border-b border-[#E5E5E5] pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
            {breadcrumbs.map((crumb, index) => (
              <div key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-[#111111]">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 ? <span>/</span> : null}
              </div>
            ))}
          </nav>
        ) : null}

        <h1 className="editorial-heading text-4xl md:text-5xl text-[#111111]">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-[#666666]">{description}</p> : null}
      </div>

      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 self-start rounded-full bg-[#111111] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]"
        >
          {actionIcon ?? <Plus size={15} />}
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
