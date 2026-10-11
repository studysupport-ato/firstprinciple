"use client";

export function BrandLogo({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <img
      src="/brand-logo.png"
      alt="Back2Basics with Kwamina"
      className={`object-contain object-center ${className}`}
      width={396}
      height={125}
      loading={priority ? "eager" : "lazy"}
    />
  );
}
