export const GLOBAL_CHALLENGE = "The Global Estimator Challenge";

export interface PerformanceScore {
  id: string;
  player_name: string;
  total_score: number;
  game_date: string;
  contest_id: string | null;
  contest_name: string | null;
  show_contest: boolean;
  created_at?: string;
  player_id?: string | null;
}

export function performanceRank(
  score: number,
  scores: readonly { total_score: number; created_at?: string }[],
  createdAt?: string,
) {
  // Higher score ranks first; on equal scores the earlier submission ranks higher.
  // Without createdAt, ties share a rank. Pass "9999" to rank an unsubmitted score behind equal ones.
  return scores.filter((entry) => {
    const value = Number(entry.total_score);
    if (value > score) return true;
    if (value < score) return false;
    return !!createdAt && !!entry.created_at && entry.created_at < createdAt;
  }).length + 1;
}

export function ordinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

export function bestContestScores(scores: readonly { player_name: string; total_score: number }[]) {
  const best = new Map<string, number>();
  for (const score of scores) {
    best.set(score.player_name, Math.max(best.get(score.player_name) ?? -Infinity, Number(score.total_score)));
  }
  return [...best].map(([player_name, total_score]) => ({ player_name, total_score }));
}

export interface CertificateData {
  playerName: string;
  contestName: string;
  finalScore: number;
  worldRank: number;
  contestRank?: number;
  issuedAt: Date;
}

export function certificateMetrics(data: CertificateData) {
  return [
    { label: "FINAL SCORE", value: data.finalScore.toFixed(2) },
    ...(data.contestRank === undefined ? [] : [{ label: "CONTEST RANK", value: `#${data.contestRank}` }]),
    { label: "WORLD RANK", value: `#${data.worldRank}` },
  ];
}

export function certificateIssueDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}