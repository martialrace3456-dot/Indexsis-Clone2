const TEN_MIN = 10 * 60_000;

/** Group click timestamps into continuous 10-minute buckets (empty buckets included). */
export function bucketClicks(timestamps: string[]): { start: number; count: number }[] {
  if (!timestamps.length) return [];
  const times = timestamps.map((t) => new Date(t).getTime()).sort((a, b) => a - b);
  const first = Math.floor(times[0] / TEN_MIN) * TEN_MIN;
  const last = Math.floor(times[times.length - 1] / TEN_MIN) * TEN_MIN;
  const counts = new Map<number, number>();
  for (const t of times) {
    const k = Math.floor(t / TEN_MIN) * TEN_MIN;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const out: { start: number; count: number }[] = [];
  for (let k = first; k <= last; k += TEN_MIN) out.push({ start: k, count: counts.get(k) ?? 0 });
  return out;
}
