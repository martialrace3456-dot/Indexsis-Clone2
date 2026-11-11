import { supabase } from "@/integrations/supabase/client";
import type { PerformanceScore } from "./performanceStats";

export async function fetchGlobalScores(): Promise<PerformanceScore[]> {
  const scores: PerformanceScore[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("scores").select("*")
      .order("total_score", { ascending: false }).order("created_at", { ascending: true }).order("id")
      .range(offset, offset + 999);
    if (error) throw error;
    scores.push(...(data as PerformanceScore[]));
    if (data.length < 1000) return scores;
  }
}

export async function fetchContestScores(contestId: string) {
  const scores: { player_name: string; total_score: number; id: string; created_at: string }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("contest_scores")
      .select("id, player_name, total_score, created_at").eq("contest_id", contestId)
      .order("total_score", { ascending: false }).order("created_at", { ascending: true }).order("id")
      .range(offset, offset + 999);
    if (error) throw error;
    scores.push(...data);
    if (data.length < 1000) return scores;
  }
}