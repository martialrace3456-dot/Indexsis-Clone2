import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BIN_MS = 10 * 60 * 1000; // 10 minutes
const PAST_DAYS = 30;
const FUTURE_DAYS = 4;

export type AnalyticsParameter = "playtime" | "matches" | "rounds";

export interface BiddingFilters {
  countries: string[]; // empty = All
  age: string; // 'all' | 'above_12' | 'above_16' | 'above_18'
  contests: string[];
  ads: string[];
}

interface ScoreRow {
  created_at: string;
  duration_seconds: number | null;
  player_id: string | null;
  contest_id: string | null;
}
interface PlayerRow { id: string; country: string | null; age_group: string | null; }

export interface AnalyticsBin {
  time: number; // bin start ms
  past: number | null;
  predicted: number | null;
  volume: number; // predicted total runtime available bid bricks (minutes), already minus 25%
  isFuture: boolean;
}

export function useBiddingAnalytics(parameter: AnalyticsParameter, filters: BiddingFilters) {
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [players, setPlayers] = useState<Record<string, PlayerRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - PAST_DAYS * 86400000).toISOString();
      const [{ data: s }, { data: pl }] = await Promise.all([
        supabase.from("scores").select("created_at, duration_seconds, player_id, contest_id").gte("created_at", since),
        supabase.from("players").select("id, country, age_group"),
      ]);
      setScores((s ?? []) as ScoreRow[]);
      const map: Record<string, PlayerRow> = {};
      (pl ?? []).forEach((p) => { map[(p as PlayerRow).id] = p as PlayerRow; });
      setPlayers(map);
      setLoading(false);
    })();
  }, []);

  const bins = useMemo<AnalyticsBin[]>(() => {
    const now = Date.now();
    const start = Math.floor((now - PAST_DAYS * 86400000) / BIN_MS) * BIN_MS;
    const end = Math.floor((now + FUTURE_DAYS * 86400000) / BIN_MS) * BIN_MS;
    const nowBin = Math.floor(now / BIN_MS) * BIN_MS;

    // bucket counts for past
    const buckets = new Map<number, { playtime: number; matches: number; rounds: number }>();
    for (const sc of scores) {
      const player = sc.player_id ? players[sc.player_id] : null;
      if (filters.countries.length && (!player?.country || !filters.countries.includes(player.country))) continue;
      if (filters.age !== "all" && (!player?.age_group || player.age_group !== filters.age)) continue;
      if (filters.contests.length && (!sc.contest_id || !filters.contests.includes(sc.contest_id))) continue;
      // ads filter currently has no telemetry tie-in; ignored when not "all"
      const t = new Date(sc.created_at).getTime();
      const bin = Math.floor(t / BIN_MS) * BIN_MS;
      const cur = buckets.get(bin) ?? { playtime: 0, matches: 0, rounds: 0 };
      cur.matches += 1;
      cur.rounds += 7; // fixed 7 rounds per match per project memory
      cur.playtime += Math.round((sc.duration_seconds ?? 0) / 60);
      buckets.set(bin, cur);
    }

    // simple seasonal predictor: same time-of-day average across past 30 days
    const dayOfWeekHourBucket = new Map<string, { sum: number; n: number }>();
    for (const [bin, v] of buckets) {
      const d = new Date(bin);
      const key = `${d.getDay()}-${d.getHours()}-${Math.floor(d.getMinutes() / 10)}`;
      const cur = dayOfWeekHourBucket.get(key) ?? { sum: 0, n: 0 };
      const val = parameter === "playtime" ? v.playtime : parameter === "matches" ? v.matches : v.rounds;
      cur.sum += val;
      cur.n += 1;
      dayOfWeekHourBucket.set(key, cur);
    }

    const result: AnalyticsBin[] = [];
    for (let t = start; t <= end; t += BIN_MS) {
      const isFuture = t > nowBin;
      const v = buckets.get(t);
      const pastVal = v ? (parameter === "playtime" ? v.playtime : parameter === "matches" ? v.matches : v.rounds) : 0;
      const d = new Date(t);
      const key = `${d.getDay()}-${d.getHours()}-${Math.floor(d.getMinutes() / 10)}`;
      const stat = dayOfWeekHourBucket.get(key);
      const predicted = stat && stat.n > 0 ? stat.sum / stat.n : 0;
      const baseRuntime = parameter === "playtime" ? predicted : predicted * 1.5; // approximate runtime per bin in minutes
      const volume = Math.max(0, Math.round(baseRuntime * 0.75 / 10)); // # of 10-min slots after -25%
      result.push({
        time: t,
        past: isFuture ? null : pastVal,
        predicted: isFuture ? predicted : null,
        volume,
        isFuture,
      });
    }
    return result;
  }, [scores, players, parameter, filters]);

  return { bins, loading };
}

export const BIN_MINUTES = 10;