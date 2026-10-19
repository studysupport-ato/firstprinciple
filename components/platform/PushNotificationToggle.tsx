"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Check, Info, Loader2, Share } from "lucide-react";

import { getClientPushConfig } from "@/lib/push/clientConfig";
import {
  getNotificationPermission,
  isIosStandaloneRequired,
  isPushSupported,
} from "@/lib/push/vapidClient";
import {
  checkDevicePushSubscriptionActive,
  disableDevicePushNotifications,
  enableDevicePushNotifications,
} from "@/lib/push/clientSubscription";

export function PushNotificationToggle() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [iosPwaRequired, setIosPwaRequired] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check support and current subscription on mount
  useEffect(() => {
    const isSupported = isPushSupported();
    setSupported(isSupported);

    if (!isSupported) {
      if (isIosStandaloneRequired()) {
        setIosPwaRequired(true);
      }
      return;
    }

    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);

    if (currentPermission !== "granted") {
      setIsSubscribed(false);
      return;
    }

    // Check if service worker is registered and subscribed
    void checkDevicePushSubscriptionActive().then((active) => {
      setIsSubscribed(active);
    });

    const handleSubscriptionChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ active: boolean }>;
      if (typeof customEvent.detail?.active === "boolean") {
        setIsSubscribed(customEvent.detail.active);
      }
    };

    window.addEventListener("push-subscription-changed", handleSubscriptionChange);
    return () => {
      window.removeEventListener("push-subscription-changed", handleSubscriptionChange);
    };
  }, []);

  async function handleEnablePush() {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await enableDevicePushNotifications();
    setLoading(false);

    if (result.ok) {
      setIsSubscribed(true);
      setStatusMessage("Device notifications enabled!");
      setPermission("granted");
    } else {
      setIsSubscribed(false);
      setErrorMessage(result.error);
      if (result.permissionDenied) {
        setPermission("denied");
      }
    }
  }

  async function handleDisablePush() {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await disableDevicePushNotifications();
    setLoading(false);

    if (result.ok) {
      setIsSubscribed(false);
      setStatusMessage("Device notifications turned off.");
    } else {
      setErrorMessage(result.error ?? "Failed to disable notifications.");
    }
  }

  // Unsupported or iOS standalone requirement
  if (iosPwaRequired) {
    return (
      <div className="border-t border-[#ECE7DC] bg-[#FFFBF0] px-4 py-3 text-xs text-[#6B5722]">
        <div className="flex items-start gap-2">
          <Share size={15} className="mt-0.5 shrink-0 text-[#9C7923]" aria-hidden="true" />
          <p>
            To receive lock-screen announcements on iPhone or iPad, tap <strong>Share</strong> and select{" "}
            <strong>Add to Home Screen</strong>.
          </p>
        </div>
      </div>
    );
  }

  if (supported === false) {
    return null; // Gracefully invisible on unsupported browsers
  }

  const clientConfig = getClientPushConfig();
  if (!clientConfig.configured) {
    return null; // Gracefully hidden if VAPID keys aren't configured yet
  }

  return (
    <div className="border-t border-[#ECE7DC] bg-[#FAF8F3] px-4 py-3 text-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <BellRing size={15} className="text-[#9C7923]" aria-hidden="true" />
          ) : (
            <Bell size={15} className="text-[#787265]" aria-hidden="true" />
          )}
          <span className="font-semibold text-[#302B20]">
            {isSubscribed ? "Device alerts on" : "Device notifications"}
          </span>
        </div>

        {permission === "denied" ? (
          <span className="text-[11px] font-medium text-[#8C2D1C]">Permission blocked</span>
        ) : isSubscribed ? (
          <button
            type="button"
            onClick={() => void handleDisablePush()}
            disabled={loading}
            className="rounded-md border border-[#D5CDBC] bg-white px-2 py-1 text-[11px] font-medium text-[#504C43] hover:bg-[#F2ECE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B18B21] disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : "Disable"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleEnablePush()}
            disabled={loading}
            className="rounded-md bg-[#F0C84A] px-2.5 py-1 text-[11px] font-bold text-[#2A220F] shadow-sm hover:bg-[#E2B734] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B18B21] disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" />
                <span>Enabling...</span>
              </span>
            ) : (
              "Enable"
            )}
          </button>
        )}
      </div>

      {statusMessage ? (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[#2E6B34]">
          <Check size={12} aria-hidden="true" />
          <span>{statusMessage}</span>
        </p>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="mt-1.5 flex items-start gap-1 text-[11px] font-medium text-[#8C2D1C]">
          <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </p>
      ) : null}

      {permission === "denied" ? (
        <p className="mt-1 text-[10px] text-[#787265]">
          You have blocked notifications for this site. To turn them on, update your browser site settings.
        </p>
      ) : null}
    </div>
  );
}
