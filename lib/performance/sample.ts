export function isPerformanceSampled(): boolean {
  const configuredRate = Number(process.env.PERF_TIMING_SAMPLE_RATE);
  const rate = Number.isFinite(configuredRate)
    ? Math.min(1, Math.max(0, configuredRate))
    : process.env.NODE_ENV === "production"
      ? 0.01
      : 1;
  return rate >= 1 || (rate > 0 && Math.random() < rate);
}
