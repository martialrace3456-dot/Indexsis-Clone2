import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AnalyticsMetric, AnalyticsFilters } from "@/types/admin";
import { analyticsRange, buildAnalytics, DEFAULT_ACTIVE_FILTERS, type ActiveFilters, type AnalyticsRecord } from "@/utils/gameAnalytics";

// Read every page: the Data API's default row limit must not truncate totals.
async function readPages<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await query(offset, offset + 999);
    if (result.error) throw result.error;
    rows.push(...(result.data ?? []));
    if (!result.data || result.data.length < 1000) return rows;
  }
}
export function useGameAnalytics(metric: AnalyticsMetric, filters: AnalyticsFilters, dateFrom: Date, dateTo: Date, active: ActiveFilters = DEFAULT_ACTIVE_FILTERS) {
  const [analytics, setAnalytics] = useState<ReturnType<typeof buildAnalytics> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const fetchAnalytics = useCallback(async () => {
    const request = ++generation.current;
    try {
      const range = analyticsRange(dateFrom, dateTo);
      const start = new Date(range.start).toISOString(), end = new Date(range.end).toISOString();
      const [intervals, exposures, scores, players, campaigns, contests] = await Promise.all([
        readPages((a,b) => supabase.from("gameplay_intervals").select("*").gte("ended_at", start).lt("started_at", end).order("id").range(a,b)),
        readPages((a,b) => supabase.from("ad_exposure_intervals").select("*").gte("ended_at", start).lt("started_at", end).order("id").range(a,b)),
        readPages((a,b) => supabase.from("scores").select("id,player_id,player_name,contest_id,game_date,duration_seconds,total_score,analytics_match_id").gte("game_date", start).lt("game_date", end).order("id").range(a,b)),
        readPages((a,b) => supabase.from("players").select("id,country,age_group").order("id").range(a,b)),
        readPages((a,b) => supabase.from("ad_campaigns").select("id,starts_at,ends_at,payment_status,status,created_at,contest_targets,country_targets,age_target").eq("payment_status","approved").in("status",["live","expired"]).order("id").range(a,b)),
        readPages((a,b) => supabase.from("contests").select("id,starts_at,ends_at,approval_status").eq("approval_status","approved").order("id").range(a,b)),
      ]);
      const profiles = new Map(players.map((p) => [p.id,p]));
      const tracked = new Set(intervals.map((r) => r.match_id));
      const records: AnalyticsRecord[] = intervals.map((r) => ({ id:r.id, matchId:r.match_id,playerKey:r.player_key,contestId:r.contest_id,country:r.country,ageGroup:r.age_group,start:Date.parse(r.started_at),end:Date.parse(r.ended_at),seconds:r.seconds,round:r.round_number,completed:r.round_completed }));
      // Historical scores have no exposure history. Retain known gameplay, never invent ad reach.
      for (const score of scores) {
        if (score.analytics_match_id && tracked.has(score.analytics_match_id)) continue;
        const profile = score.player_id ? profiles.get(score.player_id) : undefined;
        const timestamp = Date.parse(score.game_date);
        for (let round = 1; round <= 7; round++) records.push({ id:`legacy:${score.id}:${round}`,matchId:score.id,playerKey:score.player_id ?? `legacy:${score.player_name}`,contestId:score.contest_id,country:profile?.country ?? null,ageGroup:profile?.age_group ?? null,start:timestamp-(score.duration_seconds ?? 0)*1000,end:timestamp,seconds:(score.duration_seconds ?? 0)/7,round,completed:true,score:Number(score.total_score) });
      }
      const selectedCampaigns = campaigns.filter((c) => (!active.contests || !filters.contests.length || !c.contest_targets.length || c.contest_targets.some((id) => filters.contests.includes(id))) && (!active.countries || !filters.countries.length || !c.country_targets.length || c.country_targets.some((country) => filters.countries.includes(country))) && (!active.ageGroups || !filters.ageGroups.length || c.age_target === "all" || filters.ageGroups.includes(c.age_target)));
      const result = buildAnalytics(records, exposures, selectedCampaigns.map((c) => ({id:c.id,start:Date.parse(c.starts_at ?? c.created_at),end:c.ends_at ? Date.parse(c.ends_at) : Date.now()})),contests.map((c) => ({id:c.id,start:Date.parse(c.starts_at),end:Date.parse(c.ends_at)})),filters,active,dateFrom,dateTo,metric);
      if (request === generation.current) { setAnalytics(result); setError(null); }
    } catch (e) {
      console.error("Analytics fetch failed", e);
      if (request === generation.current) setError(e instanceof Error ? e.message : "Unable to load analytics. Please retry.");
    } finally { if (request === generation.current) setLoading(false); }
  }, [metric, filters, dateFrom, dateTo, active]);
  useEffect(() => {
    void fetchAnalytics();
    let scheduled: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => { if (scheduled) clearTimeout(scheduled); scheduled = setTimeout(() => void fetchAnalytics(), 250); };
    const channel = supabase.channel(`game-analytics-${crypto.randomUUID()}`);
    for (const table of ["scores","players","contests","ad_campaigns","gameplay_intervals","ad_exposure_intervals"]) channel.on("postgres_changes",{event:"*",schema:"public",table},refresh);
    channel.subscribe();
    const timer = setInterval(refresh, 30000);
    return () => { generation.current++; clearTimeout(scheduled); clearInterval(timer); void supabase.removeChannel(channel); };
  }, [fetchAnalytics]);
  return { analytics, loading, error, refetch: fetchAnalytics };
}
