export type ServerTimingContext = {
  route: string;
  requestId: string;
  sampled: boolean;
};

export async function withServerTimingSpan<T>(
  context: ServerTimingContext | undefined,
  phase: string,
  operation: () => Promise<T> | PromiseLike<T>,
): Promise<T> {
  if (!context?.sampled) return operation();

  const startedAt = performance.now();
  let outcome: "returned" | "threw" = "returned";
  try {
    return await operation();
  } catch (error) {
    outcome = "threw";
    throw error;
  } finally {
    recordServerTimingDuration(context, phase, performance.now() - startedAt, outcome);
  }
}

export function recordServerTimingDuration(
  context: ServerTimingContext | undefined,
  phase: string,
  durationMs: number,
  outcome: "returned" | "threw" = "returned",
) {
  if (!context?.sampled) return;
  console.info(
    JSON.stringify({
      event: "server_phase_timing",
      route: context.route,
      requestId: context.requestId,
      phase,
      durationMs: Math.round(durationMs),
      outcome,
    }),
  );
}
