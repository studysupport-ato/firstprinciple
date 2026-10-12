"use client";

/** Switch an item between "Available" and "Not available at the moment" (students see it greyed out). */
export function AvailabilityToggle({
  available,
  disabled,
  onChange,
  label,
}: {
  available: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={!available}
      aria-label={`${label}: ${available ? "available" : "not available at the moment"}. Click to change.`}
      onClick={() => onChange(!available)}
      className={`min-h-9 shrink-0 rounded-full px-3.5 text-[13px] font-bold transition disabled:opacity-50 ${
        available ? "bg-[#2C3A2A] text-[#BFE3CF] hover:brightness-125" : "border border-dashed border-[#6F6753] text-[#B8AE95] hover:bg-white/5"
      }`}
    >
      {available ? "Available" : "Not available at the moment"}
    </button>
  );
}
