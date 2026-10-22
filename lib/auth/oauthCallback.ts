const CALLBACK_FAILURE_DESTINATION = "/auth/error?reason=oauth";
const DEFAULT_SUCCESS_DESTINATION = "/courses";
const REDIRECT_ORIGIN = "https://oauth-callback.invalid";

export function isOAuthStudentMappingValid(input: {
  studentMappingFound: boolean;
  identityProviders: readonly string[];
  requiredProvider?: string;
}): boolean {
  if (!input.studentMappingFound) return false;

  return !input.requiredProvider || input.identityProviders.includes(input.requiredProvider);
}

export function getSafeOAuthDestination(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return DEFAULT_SUCCESS_DESTINATION;
  }

  try {
    const destination = new URL(next, REDIRECT_ORIGIN);
    if (destination.origin !== REDIRECT_ORIGIN) return DEFAULT_SUCCESS_DESTINATION;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return DEFAULT_SUCCESS_DESTINATION;
  }
}

export async function completeOAuthCallback(
  params: { code: string | null; next: string | null; error: string | null },
  exchangeCode: (code: string) => Promise<boolean>,
): Promise<{ ok: true; destination: string } | { ok: false; destination: string }> {
  if (!params.code || params.error) {
    return { ok: false, destination: CALLBACK_FAILURE_DESTINATION };
  }

  try {
    if (!(await exchangeCode(params.code))) {
      return { ok: false, destination: CALLBACK_FAILURE_DESTINATION };
    }
  } catch {
    return { ok: false, destination: CALLBACK_FAILURE_DESTINATION };
  }

  return { ok: true, destination: getSafeOAuthDestination(params.next) };
}
