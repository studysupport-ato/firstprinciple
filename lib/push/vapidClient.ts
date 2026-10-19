/**
 * Converts a base64url-encoded string (such as the VAPID public key)
 * to a Uint8Array suitable for PushManager.subscribe({ applicationServerKey }).
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  if (!base64String || typeof base64String !== "string") {
    throw new Error("Invalid base64url string: input must be a non-empty string.");
  }

  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  // Decode base64
  let rawData: string;
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    rawData = window.atob(base64);
  } else if (typeof Buffer !== "undefined") {
    rawData = Buffer.from(base64, "base64").toString("binary");
  } else {
    throw new Error("No base64 decoder available in the current environment.");
  }

  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if the browser environment supports Service Workers, PushManager, and Notifications.
 */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Checks if the user is on an iOS or iPadOS device that is NOT running in standalone (PWA) mode.
 * On iOS/iPadOS, Web Push is only supported if the website has been added to the Home Screen.
 */
export function isIosStandaloneRequired(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const isIosDevice =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (!isIosDevice) return false;

  const isStandalone =
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches;

  return !isStandalone;
}

/**
 * Returns current browser notification permission or 'unsupported'.
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}
