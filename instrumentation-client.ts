import posthog from "posthog-js";

// PostHog product analytics. Runs in the browser before the app is interactive.
// Prefer the documented token name and retain the older key name for deployments.
const key = (
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ??
  process.env.NEXT_PUBLIC_POSTHOG_KEY
)?.trim();

if (key && typeof window !== "undefined") {
  try {
    posthog.init(key, {
      // Same-origin path (see rewrites in next.config.ts) so ad blockers don't drop events.
      api_host: "/ingest",
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST?.trim() || "https://us.posthog.com",
      // Pageviews on route changes (App Router) and pageleave, plus autocapture of clicks.
      defaults: "2026-05-30",
      // Only people who sign in get a profile; anonymous visitors stay anonymous.
      person_profiles: "identified_only",
      capture_exceptions: true,
      before_send: (event) => {
        if (
          event?.event === "$exception" &&
          event.properties?.$exception_list?.[0]?.value === "Script error."
        ) {
          return null;
        }
        return event;
      },
    });
  } catch (error) {
    console.warn("[PostHog] init failed", error);
  }
}
