"use client";

export function BrandLogo({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <img
      src="/logo.jpeg"
      alt="Back2Basics with Kwamina"
      className={`object-cover object-center ${className}`}
      width={360}
      height={96}
      loading={priority ? "eager" : "lazy"}
    />
  );
}
