import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Task 40G.1 — Supabase SSR session refresh (Next 16 `proxy` convention).
 *
 * Next.js 16.3.4 deprecates the `middleware` file convention in favour of
 * `proxy`; this file therefore exports `proxy` and the identical `config`
 * matcher. The runtime behaviour is the request-time session refresh below.
 *
 * Purpose is narrow: keep the Supabase auth session current across requests.
 *
 * Why this file is required (the gap found in the auth audit):
 *   `lib/supabase/server.ts` uses `createServerClient` with the publishable key
 *   and explicitly cannot persist refreshed cookies from a Server Component
 *   ("Server Components may read cookies but cannot write refreshed cookies").
 *   @supabase/ssr therefore expects a request-time hook to validate/refresh the
 *   session and write the updated cookies onto the response. Without it, a
 *   Server Component that authenticates via cookie JWT + RLS
 *   (`questions`, `assessment/[assessmentId]`, `lesson/[id]`) can present an
 *   expired access token once it ages out, making `auth.uid()` null and causing
 *   the `to authenticated` RLS policies to deny — empty student data, or a
 *   signed-in user bounced to `?auth=required`.
 *
 * What this file deliberately does NOT do:
 *   - no service-role key (uses the publishable key only, so RLS still applies)
 *   - no `students` lookup and no `students.id` resolution
 *   - no application authorization / redirects; that stays in the routes
 *   - no identity caching; that stays in `lib/student/readIdentity.ts`
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  // Without public config there is no session to maintain; pass through rather
  // than failing every request.
  if (!url || !publishableKey) return response;

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Mirror every cookie Supabase wants onto the outgoing request so the
        // Server Components rendering this same request see the fresh session...
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // ...and onto the response so the browser actually stores it.
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() validates the session against Supabase and transparently refreshes
  // an expired access token, writing the new cookies through `setAll` above.
  // This matches the existing convention in lesson/[id]/page.tsx.
  //
  // The result is intentionally not acted on: a signed-out or invalid session
  // needs no handling here (routes and RLS already cover it). We only needed
  // the side effect of a current session cookie.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on application navigations and Server Component requests so the
     * session is refreshed before RSC renders.
     *
     * Static assets are excluded so they are not slowed down:
     *   - _next/static, _next/image (optimized images)
     *   - favicon.ico, apple-touch-icon, manifest
     *   - common file extensions (svg/png/jpg/gif/webp/avif/ico/txt/xml/pdf)
     *
     * Auth endpoints are deliberately NOT excluded: those must also carry a
     * current session cookie.
     */
    "/((?!_next/static|_next/image|favicon.ico|apple-touch-icon|manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|pdf)$).*)",
  ],
};