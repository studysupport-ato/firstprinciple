"use client";

import { getClientPushConfig } from "@/lib/push/clientConfig";
import { isPushSupported, urlBase64ToUint8Array } from "@/lib/push/vapidClient";
import type { HubChoice } from "@/lib/site/materialsHub";
import { repUploadsSubscriptionStatusAction, subscribeToRepUploadsAction, unsubscribeFromRepUploadsAction } from "./uploadPushActions";

const ASKED_KEY = "b2b.repUploadPush.asked";

/** Phone notifications are possible here (Android Chrome, desktop, or an iPhone home-screen app). */
export function canUseUploadPush() {
  return isPushSupported() && getClientPushConfig().configured;
}

export function permission(): NotificationPermission | "unsupported" {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
}

export function wasAsked() {
  try {
    return window.localStorage.getItem(ASKED_KEY) === "1";
  } catch {
    return false;
  }
}
export function markAsked() {
  try {
    window.localStorage.setItem(ASKED_KEY, "1");
  } catch {
    /* storage unavailable */
  }
}

async function subscription(create: boolean) {
  const registration = (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
  await navigator.serviceWorker.ready;
  let sub = await registration.pushManager.getSubscription();
  if (!sub && create) {
    const key = getClientPushConfig().publicKey as string;
    sub = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) as BufferSource });
  }
  return sub;
}

async function register(choice: HubChoice) {
  const sub = await subscription(true);
  const json = sub?.toJSON();
  if (!json?.endpoint || !json.keys?.p256dh || !json.keys?.auth) return { ok: false as const, error: "Your browser didn’t give us a notification address." };
  return subscribeToRepUploadsAction({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }, departmentId: choice.departmentId, studyYear: choice.year });
}

/** Ask for permission (must follow a tap) and register for this programme and year. */
export async function turnOnUploadPush(choice: HubChoice) {
  if (!canUseUploadPush()) return { ok: false as const, error: "This browser can’t show notifications." };
  const result = await Notification.requestPermission();
  if (result !== "granted") return { ok: false as const, error: result === "denied" ? "Notifications are blocked for this site in your browser settings." : "Notifications weren’t allowed." };
  try {
    return await register(choice);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not switch on notifications." };
  }
}

/** Already allowed: keep the registration pointed at the current programme and year, quietly. */
export async function syncUploadPush(choice: HubChoice) {
  if (!canUseUploadPush() || Notification.permission !== "granted") return false;
  try {
    const sub = await subscription(false);
    if (sub && (await repUploadsSubscriptionStatusAction(sub.endpoint, choice.departmentId, choice.year))) return true;
    if (!wasAsked() && !sub) return false;
    const result = await register(choice);
    return result.ok;
  } catch {
    return false;
  }
}

export async function turnOffUploadPush() {
  try {
    const sub = await subscription(false);
    if (sub) await unsubscribeFromRepUploadsAction(sub.endpoint);
  } catch {
    /* ignore */
  }
}

/** Ask for permission if needed (must follow a tap) and return this phone's push address, for reminders. */
export async function pushAddress(): Promise<{ ok: true; endpoint: string; keys: { p256dh: string; auth: string } } | { ok: false; error: string }> {
  if (!canUseUploadPush()) return { ok: false, error: "This browser can’t show notifications. On iPhone, add the site to your Home Screen first." };
  const result = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (result !== "granted") return { ok: false, error: result === "denied" ? "Notifications are blocked for this site in your browser settings." : "Notifications weren’t allowed." };
  try {
    const sub = await subscription(true);
    const json = sub?.toJSON();
    if (!json?.endpoint || !json.keys?.p256dh || !json.keys?.auth) return { ok: false, error: "Your browser didn’t give us a notification address." };
    return { ok: true, endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
  } catch {
    return { ok: false, error: "Could not switch on notifications." };
  }
}

const DEVICE_KEY = "b2b.deviceId";
/** A random id for this browser, so done marks and reminders work without an account. */
export function deviceId(): string | undefined {
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}
