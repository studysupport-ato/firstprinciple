import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function AuthInput({
  label,
  error,
  icon,
  type = "text",
  className = "",
  ...props
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === "password" && showPassword ? "text" : type;

  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-[#666666]">
        {label}
      </span>

      <div
        className={[
          "group relative flex items-center gap-3 rounded-2xl border bg-[#F7F7F8] px-4 py-3.5 transition-all duration-200",
          "focus-within:border-[#111111] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(17,17,17,0.03)]",
          error ? "border-[#D97706] bg-[#FFF7ED]" : "border-[#E5E5E5]",
          className,
        ].join(" ")}
      >
        {icon ? <span className="text-[#666666] transition-colors group-focus-within:text-[#111111]">{icon}</span> : null}

        <input
          {...props}
          type={inputType}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${props.name}-error` : undefined}
          className="w-full border-0 bg-transparent text-sm text-[#111111] placeholder:text-[#999999] outline-none"
        />

        {type === "password" ? (
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((current) => !current)}
            className="rounded-full p-1 text-[#666666] transition-colors hover:text-[#111111]"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : null}
      </div>

      {error ? (
        <span id={`${props.name}-error`} role="alert" className="mt-2 block text-xs text-[#B45309]">
          {error}
        </span>
      ) : null}
    </label>
  );
}
