const statusStyles: Record<string, string> = {
  published: "bg-[#ECFDF5] text-[#059669]",
  ready: "bg-[#ECFDF5] text-[#059669]",
  "needs review": "bg-[#FFF7ED] text-[#D97706]",
  "needs-review": "bg-[#FFF7ED] text-[#D97706]",
  warning: "bg-[#FFF7ED] text-[#D97706]",
  error: "bg-[#FEF2F2] text-[#E11D48]",
  draft: "bg-[#FFF7ED] text-[#D97706]",
  archived: "bg-[#F3F4F6] text-[#6B7280]",
  active: "bg-[#EFF6FF] text-[#2563EB]",
  inactive: "bg-[#F3F4F6] text-[#4B5563]",
  upcoming: "bg-[#F5F3FF] text-[#6D28D9]",
  default: "bg-[#F7F7F8] text-[#666666]",
};

export function AdminStatusBadge({ status, label }: { status: string; label?: string }) {
  const normalized = status.toLowerCase();
  const className = statusStyles[normalized] ?? statusStyles.default;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${className}`}>
      {label || status}
    </span>
  );
}
