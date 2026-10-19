"use client";

import { getClientPushConfig } from "./clientConfig";
import {
  getNotificationPermission,
  isPushSupported,
  urlBase64ToUint8Array,
} from "./vapidClient";
import {
  getStudentPushSubscriptionStatusAction,
  registerPushSubscriptionAction,
  unregisterPushSubscriptionAction,
} from "./studentPushActions";

export type EnablePushResult =
  | { ok: true }
  | { ok: false; error: string; permissionDenied?: boolean };

/**
 * Checks if the student's browser currently has an active, server-verified push subscription.
 * Returns false if unsupported, permission not granted, no local subscription, or not verified on server.
 */
export async function checkDevicePushSubscriptionActive(): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (getNotificationPermission() !== "granted") return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;

    const res = await getStudentPushSubscriptionStatusAction(subscription.endpoint);
    return Boolean(res.ok && res.data.active);
  } catch {
    return false;
  }
}

/**
 * Subscribes the current device to browser Web Push and registers the subscription
 * with the authorized server action.
 * Must only be called after an explicit user gesture (e.g. clicking 'Enable notifications').
 */
export async function enableDevicePushNotifications(): Promise<EnablePushResult> {
  const config = getClientPushConfig();
  if (!config.configured || !config.publicKey) {
    return { ok: false, error: "Device push notifications are not configured on this server yet." };
  }

  if (!("Notification" in window) || !isPushSupported()) {
    return { ok: false, error: "Push notifications are not supported in this browser." };
  }

  // Request native permission on user gesture
  const requestResult = await Notification.requestPermission();
  if (requestResult === "denied") {
    return {
      ok: false,
      error: "Notifications are blocked in your browser settings. To enable, update site permissions.",
      permissionDenied: true,
    };
  }

  if (requestResult !== "granted") {
    return { ok: false, error: "Notification permission was not granted." };
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    const applicationServerKey = urlBase64ToUint8Array(config.publicKey);
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });
    }

    const rawJson = subscription.toJSON();
    if (!rawJson.endpoint || !rawJson.keys?.p256dh || !rawJson.keys?.auth) {
      return { ok: false, error: "Could not extract subscription keys from your browser." };
    }

    const saveResult = await registerPushSubscriptionAction({
      endpoint: rawJson.endpoint,
      keys: {
        p256dh: rawJson.keys.p256dh,
        auth: rawJson.keys.auth,
      },
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });

    if (!saveResult.ok) {
      return { ok: false, error: saveResult.error };
    }

    // Notify any listening components on the page (e.g. NotificationBell PushNotificationToggle)
    window.dispatchEvent(new CustomEvent("push-subscription-changed", { detail: { active: true } }));

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to enable notifications.",
    };
  }
}

/**
 * Disables browser Web Push for this device and unregisters it on the server.
 */
export async function disableDevicePushNotifications(): Promise<{ ok: boolean; error?: string }> {
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await unregisterPushSubscriptionAction({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
    }

    window.dispatchEvent(new CustomEvent("push-subscription-changed", { detail: { active: false } }));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to disable notifications.",
    };
  }
}
