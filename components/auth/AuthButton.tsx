import { ArrowRight, Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}

export function AuthButton({
  children,
  isLoading = false,
  variant = "primary",
  className = "",
  disabled,
  ...props
}: AuthButtonProps) {
  const variantClasses = {
    primary:
      "bg-gradient-to-b from-[#1d1d20] to-[#111111] text-white hover:from-[#242429] hover:to-[#16161a] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_20px_40px_-14px_rgba(17,17,17,0.6)]",
    secondary:
      "border border-[#E5E5E5] bg-white text-[#111111] hover:border-[#111111] hover:bg-[#F7F7F8]",
    ghost: "border border-transparent bg-transparent text-[#111111] hover:bg-[#F7F7F8]",
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={[
        "inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]/20 disabled:cursor-not-allowed disabled:opacity-70",
        variantClasses[variant],
        className,
      ].join(" ")}
    >
      {isLoading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>Processing</span>
        </>
      ) : (
        <>
          {children}
          {variant === "primary" ? <ArrowRight size={16} /> : null}
        </>
      )}
    </button>
  );
}
