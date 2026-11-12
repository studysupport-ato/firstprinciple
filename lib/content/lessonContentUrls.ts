import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed, cacheable addresses for lesson step content.
 *
 * The lesson page checks that the student may open the lesson, then hands the browser one
 * address per step. Each address carries the lesson's content version and a signature, so the
 * same step is the same address for every student: Vercel's CDN keeps one copy per step and
 * version, and the server and database are only asked again after the lesson changes.
 */

function secret() {
  const value = (process.env.LESSON_CONTENT_SIGNING_SECRET ?? process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (!value) throw new Error("No signing secret is configured for lesson content.");
  return value;
}

export function signLessonStep(dayId: string, step: number, version: string) {
  return createHmac("sha256", secret()).update(`lesson-step:${dayId}:${step}:${version}`).digest("base64url").slice(0, 32);
}

export function verifyLessonStep(dayId: string, step: number, version: string, signature: string) {
  const expected = Buffer.from(signLessonStep(dayId, step, version));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function lessonStepUrl(dayId: string, step: number, version: string) {
  return `/api/lesson-content/${encodeURIComponent(dayId)}/${step}?v=${encodeURIComponent(version)}&s=${signLessonStep(dayId, step, version)}`;
}
