"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BellRing, Check, Info, Loader2, X } from "lucide-react";
import { usePathname } from "next/navigation";

import { useAuthSession } from "@/lib/auth/useAuthSession";
import { getClientPushConfig } from "@/lib/push/clientConfig";
import {
  getNotificationPermission,
  isPushSupported,
  isIosStandaloneRequired,
} from "@/lib/push/vapidClient";
import {
  checkDevicePushSubscriptionActive,
  enableDevicePushNotifications,
} from "@/lib/push/clientSubscription";

export const DISMISSAL_LOCALSTORAGE_KEY = "first-principles-push-optin-dismissed-v1";

export function PushNotificationOptInModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pathname = usePathname();
  const { authenticated, studentLoading } = useAuthSession();
  const modalRef = useRef<HTMLDivElement>(null);
  const enableButtonRef = useRef<HTMLButtonElement>(null);

  // Check eligibility and schedule popup display
  useEffect(() => {
    // 1. Guard against non-student areas or unready auth
    if (studentLoading || authenticated !== true) return;
    if (!pathname) return;

    // Never show on login, auth confirmation, or admin areas
    if (
      pathname.startsWith("/admin") ||
      pathname === "/login" ||
      pathname.startsWith("/auth") ||
      pathname === "/terms"
    ) {
      return;
    }

    // 2. Check local dismissal persistence
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem(DISMISSAL_LOCALSTORAGE_KEY) === "true") {
        return;
      }
    } catch {
      // LocalStorage access restricted; proceed safely
    }

    // 3. Browser capability check
    if (!isPushSupported()) return;
    if (isIosStandaloneRequired()) return; // iOS requires Add to Home Screen first

    // 4. Server VAPID configuration check
    const clientConfig = getClientPushConfig();
    if (!clientConfig.configured || !clientConfig.publicKey) return;

    // 5. If browser permission was explicitly denied previously, do not repeatedly pop up
    if (getNotificationPermission() === "denied") return;

    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    // 6. Check if the device is already actively subscribed
    void checkDevicePushSubscriptionActive().then((isActive) => {
      if (cancelled || isActive) return;

      // Small delay (1.2s) after student area is ready so it doesn't jarringly fight initial render
      timerId = setTimeout(() => {
        if (!cancelled) {
          setIsOpen(true);
        }
      }, 1200);
    });

    return () => {
      cancelled = true;
      if (timerId !== null) {
        clearTimeout(timerId);
      }
    };
  }, [authenticated, studentLoading, pathname]);

  // Focus management & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    // Focus primary button when modal opens
    const focusTimer = setTimeout(() => {
      enableButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(DISMISSAL_LOCALSTORAGE_KEY, "true");
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    setErrorMessage(null);

    const result = await enableDevicePushNotifications();
    setLoading(false);

    if (result.ok) {
      setSuccess(true);
      // Remember that opt-in was resolved so modal won't re-appear
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(DISMISSAL_LOCALSTORAGE_KEY, "true");
        }
      } catch {
        // Ignore storage errors
      }

      // Close modal gracefully after success feedback
      setTimeout(() => {
        setIsOpen(false);
      }, 1200);
    } else {
      setErrorMessage(result.error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-[#1A1814]/40 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={loading ? undefined : handleDismiss}
            aria-hidden="true"
          />

          {/* Modal Card */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="push-optin-title"
            aria-describedby="push-optin-desc"
            className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-[#E7E1D2] bg-[#FFFEFA] p-6 shadow-[0_20px_48px_rgba(26,24,20,0.14)] sm:p-7"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={handleDismiss}
              disabled={loading}
              aria-label="Close notification prompt"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[#787265] transition hover:bg-[#F2ECE0] hover:text-[#1A1814] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B18B21] disabled:opacity-50"
            >
              <X size={16} />
            </button>

            <div className="flex flex-col gap-4">
              {/* Badge Icon */}
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF6D6] text-[#9C7923]">
                <BellRing size={22} aria-hidden="true" />
              </div>

              {/* Title & Copy */}
              <div>
                <h2
                  id="push-optin-title"
                  className="font-serif text-2xl font-bold tracking-tight text-[#1A1814]"
                >
                  Stay in the loop.
                </h2>
                <p
                  id="push-optin-desc"
                  className="mt-2 text-sm leading-relaxed text-[#5C5649]"
                >
                  Get important announcements and study updates, even when you&apos;re away from First Principles.
                </p>
              </div>

              {/* Success feedback */}
              {success ? (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-xl bg-[#EBF6EE] px-3.5 py-2.5 text-xs font-semibold text-[#1F6E36]"
                >
                  <Check size={16} className="shrink-0" aria-hidden="true" />
                  <span>Notifications enabled! You&apos;re all set.</span>
                </div>
              ) : null}

              {/* Error feedback */}
              {errorMessage ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl bg-[#FDF2F2] px-3.5 py-2.5 text-xs font-medium text-[#991B1B]"
                >
                  <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              ) : null}

              {/* Actions */}
              {!success ? (
                <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    disabled={loading}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D5CDBC] bg-transparent px-4 py-2.5 text-sm font-semibold text-[#5C5649] transition hover:bg-[#F2ECE0] hover:text-[#1A1814] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B18B21] disabled:opacity-50"
                  >
                    Maybe later
                  </button>

                  <button
                    ref={enableButtonRef}
                    type="button"
                    onClick={() => void handleEnable()}
                    disabled={loading}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F0C84A] px-5 py-2.5 text-sm font-bold text-[#2A220F] shadow-sm transition hover:bg-[#E2B734] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B18B21] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                        <span>Enabling...</span>
                      </>
                    ) : (
                      "Enable notifications"
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
