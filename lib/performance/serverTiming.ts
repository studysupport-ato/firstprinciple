import { headers } from "next/headers";

export type ServerTimingContext = {
  route: string;
  requestId: string;
  sampled: boolean;
};

export async function withServerRouteTiming<T>(
  route: string,
  operation: (context: ServerTimingContext) => Promise<T>,
): Promise<T> {
  const requestHeaders = await headers();
  const requestId = requestHeaders.get("x-perf-request-id") ?? crypto.randomUUID();
  const sampled = requestHeaders.get("x-perf-sampled") === "1";
  if (!sampled) return operation({ route, requestId, sampled });

  const startedAt = performance.now();
  let outcome: "returned" | "threw" = "returned";
  try {
    return await operation({ route, requestId, sampled });
  } catch (error) {
    outcome = "threw";
    throw error;
  } finally {
    console.info(
      JSON.stringify({
        event: "server_route_timing",
        route,
        requestId,
        durationMs: Math.round(performance.now() - startedAt),
        outcome,
      }),
    );
  }
}

export function createTimedSupabaseFetch(context: ServerTimingContext): typeof fetch {
  if (!context.sampled) return fetch;

  return async (input, init) => {
    const requestUrl = input instanceof Request ? input.url : String(input);
    const pathname = new URL(requestUrl).pathname;
    const endpoint = pathname.match(/^\/(rest|auth|storage)\/v1\/([^/]+)/);
    const service = endpoint?.[1] ?? "other";
    const resource = service === "rest" && /^[a-z_]+$/i.test(endpoint?.[2] ?? "")
      ? endpoint![2]
      : service;
    const startedAt = performance.now();
    let status: number | null = null;
    let contentLength: string | null = null;
    let contentRange: string | null = null;
    let networkError = false;
    try {
      const response = await fetch(input, init);
      status = response.status;
      contentLength = response.headers.get("content-length");
      contentRange = response.headers.get("content-range");
      return response;
    } catch (error) {
      networkError = true;
      throw error;
    } finally {
      console.info(
        JSON.stringify({
          event: "supabase_request_timing",
          route: context.route,
          requestId: context.requestId,
          service,
          resource,
          durationMs: Math.round(performance.now() - startedAt),
          status,
          contentLength,
          contentRange,
          networkError,
        }),
      );
    }
  };
}
