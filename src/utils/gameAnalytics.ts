import type { AnalyticsFilters, AnalyticsMetric } from "@/types/admin";

export const GLOBAL_CONTEST = "global";
export type FilterKey = keyof AnalyticsFilters;
export type ActiveFilters = Record<FilterKey, boolean>;
export const DEFAULT_ACTIVE_FILTERS: ActiveFilters = { contests: true, countries: true, ageGroups: true, ads: false };
export function toggleSelection(selected: string[], value: string): string[] {
  if (value === "all") return [];
  return selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
}
export function filterMetric(metric: AnalyticsMetric, active: ActiveFilters, activated = false): AnalyticsMetric {
  return activated || (active.ads && metric === "ads") ? "runtime" : metric;
}
export function analyticsRange(from: Date, to: Date) {
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end = new Date(to); end.setHours(23, 59, 59, 999);
  if (start > end) throw new Error("T1 must be on or before T2.");
  return { start: start.getTime(), end: end.getTime() + 1 };
}
export interface AnalyticsRecord {
  id: string; matchId: string; playerKey: string; contestId: string | null;
  country: string | null; ageGroup: string | null; start: number; end: number;
  seconds: number; round: number; completed: boolean; score?: number;
}
export interface Exposure { interval_id: string; campaign_id: string; started_at: string; ended_at: string; seconds: number }
export interface ActiveSpan { id: string; start: number; end: number }
export interface AnalyticsPoint { timestamp: number; count: number }
export function matchesFilters(record: AnalyticsRecord, filters: AnalyticsFilters, active: ActiveFilters) {
  return (!active.contests || !filters.contests.length || filters.contests.includes(record.contestId ?? GLOBAL_CONTEST))
    && (!active.countries || !filters.countries.length || (record.country !== null && filters.countries.includes(record.country)))
    && (!active.ageGroups || !filters.ageGroups.length || (record.ageGroup !== null && filters.ageGroups.includes(record.ageGroup)));
}
// Union exposure intervals: two simultaneous ads must not double-count a player's time.
export function unionSpans(spans: { start: number; end: number }[]) {
  const merged: { start: number; end: number }[] = [];
  for (const span of [...spans].sort((a, b) => a.start - b.start)) {
    if (span.end <= span.start) continue;
    const last = merged.at(-1);
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
    else merged.push({ ...span });
  }
  return merged;
}
export function buildAnalytics(records: AnalyticsRecord[], exposures: Exposure[], campaigns: ActiveSpan[], contests: ActiveSpan[], filters: AnalyticsFilters, active: ActiveFilters, from: Date, to: Date, metric: AnalyticsMetric) {
  const range = analyticsRange(from, to);
  const dayCount = (range.end - range.start) / 86400000;
  const bucketMs = dayCount <= 2 ? 3600000 : dayCount <= 90 ? 86400000 : 604800000;
  const points: AnalyticsPoint[] = [];
  const sets: Set<string>[] = [];
  for (let timestamp = range.start; timestamp < range.end; timestamp += bucketMs) { points.push({ timestamp, count: 0 }); sets.push(new Set()); }
  const matching = records.filter((r) => r.end >= range.start && r.start < range.end && matchesFilters(r, filters, active));
  const exposureMap = new Map<string, Exposure[]>();
  for (const e of exposures) {
    if (active.ads && filters.ads.length && !filters.ads.includes(e.campaign_id)) continue;
    exposureMap.set(e.interval_id, [...(exposureMap.get(e.interval_id) ?? []), e]);
  }
  const matches = new Set<string>(), players = new Set<string>(), rounds = new Set<string>(), reachedContests = new Set<string>(), countries = new Set<string>();
  let runtimeSeconds = 0;
  for (const record of matching) {
    const spans = active.ads ? unionSpans((exposureMap.get(record.id) ?? []).map((e) => ({ start: Math.max(record.start, Date.parse(e.started_at), range.start), end: Math.min(record.end, Date.parse(e.ended_at), range.end) })))
      : [{ start: Math.max(record.start, range.start), end: Math.min(record.end, range.end) }];
    if (active.ads && !spans.length) continue;
    matches.add(record.matchId); players.add(record.playerKey); reachedContests.add(record.contestId ?? GLOBAL_CONTEST);
    if (record.country) countries.add(record.country);
    if (record.completed || active.ads) rounds.add(`${record.matchId}:${record.playerKey}:${record.round}`);
    for (const span of spans) {
      const duration = record.end - record.start;
      const seconds = Math.max(0, span.end - span.start) / 1000 * (active.ads || duration <= 0 ? 1 : Math.min(1, record.seconds * 1000 / duration));
      runtimeSeconds += seconds;
      const first = Math.max(0, Math.min(points.length - 1, Math.floor((span.start - range.start) / bucketMs)));
      const last = Math.max(first, Math.min(points.length - 1, Math.floor((Math.max(span.start, span.end - 1) - range.start) / bucketMs)));
      for (let i = first; i <= last; i++) {
        const overlap = Math.max(0, Math.min(span.end, points[i].timestamp + bucketMs) - Math.max(span.start, points[i].timestamp));
        if (metric === "runtime") points[i].count += duration > 0 ? seconds * overlap / Math.max(1, span.end - span.start) / 60 : 0;
        const key = metric === "participants" ? record.playerKey : metric === "match" ? record.matchId : metric === "rounds" && (record.completed || active.ads) ? `${record.matchId}:${record.playerKey}:${record.round}` : metric === "country" ? record.country : metric === "contests" ? record.contestId ?? GLOBAL_CONTEST : null;
        if (key) sets[i].add(key);
      }
    }
  }
  if (metric === "ads" && !active.ads) {
    // Campaigns must have actual matching delivery; scheduled but unseen ads are not reach.
    const matchingIds = new Set(matching.map((r) => r.id));
    for (const e of exposures) {
      if (!matchingIds.has(e.interval_id)) continue;
      const start = Math.max(range.start, Date.parse(e.started_at)), end = Math.min(range.end, Date.parse(e.ended_at));
      for (let i = 0; i < points.length; i++) if (start < points[i].timestamp + bucketMs && end > points[i].timestamp) sets[i].add(e.campaign_id);
    }
  }
  // All-category contest and ad metrics also show true multi-day active spans when demographic filters are unrestricted.
  if (!active.ads && (!active.countries || !filters.countries.length) && (!active.ageGroups || !filters.ageGroups.length) && (metric === "ads" || metric === "contests")) {
    const spans = metric === "ads" ? campaigns : contests.filter((c) => !active.contests || !filters.contests.length || filters.contests.includes(c.id));
    for (const span of spans) for (let i = 0; i < points.length; i++) if (span.start < Math.min(range.end, points[i].timestamp + bucketMs) && span.end > points[i].timestamp) sets[i].add(span.id);
  }
  if (metric !== "runtime") points.forEach((p, i) => { p.count = sets[i].size; });
  return { points, bucketMs, summary: { matches: matches.size, rounds: rounds.size, runtimeSeconds, participants: players.size, contests: reachedContests.size, countries: countries.size } };
}