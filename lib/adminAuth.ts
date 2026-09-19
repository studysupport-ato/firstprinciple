export const ADMIN_AUTH_KEY = "first-principles-admin-auth";

export function isAdminAuthenticated() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(ADMIN_AUTH_KEY) === "true";
}

export function setAdminAuthenticated(value: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  if (value) {
    window.localStorage.setItem(ADMIN_AUTH_KEY, "true");
    return;
  }

  window.localStorage.removeItem(ADMIN_AUTH_KEY);
}
