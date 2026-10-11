// Clock access isolated in one place so server components stay lint-clean and tests can stub it.
export function nowMs() {
  return Date.now();
}
export function isoAgo(ms: number) {
  return new Date(nowMs() - ms).toISOString();
}
export function isStale(iso: string | null | undefined, maxAgeMs: number) {
  if (!iso) return true;
  return nowMs() - new Date(iso).getTime() > maxAgeMs;
}
