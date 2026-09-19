"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { isAdminAuthenticated } from "@/lib/adminAuth";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setReady(true);
      return;
    }

    if (!isAdminAuthenticated()) {
      router.replace("/admin/login");
      return;
    }

    setReady(true);
  }, [pathname, router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-6">
        <div className="font-sans text-xs font-bold uppercase tracking-[0.26em] text-[#666666]">Checking access…</div>
      </div>
    );
  }

  if (!isAdminAuthenticated()) {
    return null;
  }

  return <>{children}</>;
}
