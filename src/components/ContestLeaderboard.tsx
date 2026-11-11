import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ContestWithParticipants, ContestScore } from "@/types/contest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Search, Trophy, Medal } from "lucide-react";
import { CertificateActions } from "@/components/CertificateActions";
import { fetchContestScores } from "@/utils/statsQueries";
import { performanceRank } from "@/utils/performanceStats";

interface ContestLeaderboardProps {
  contest: ContestWithParticipants;
  currentPlayerName?: string;
  onBack: () => void;
}

interface AggregatedScore {
  player_name: string;
  best_score: number;
  games_played: number;
}

export function ContestLeaderboard({ contest, currentPlayerName, onBack }: ContestLeaderboardProps) {
  const [scores, setScores] = useState<AggregatedScore[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetchScores();
  }, [contest.id]);

  const fetchScores = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const data = await fetchContestScores(contest.id);

      // Aggregate scores by player (best score + games played)
      const playerMap = new Map<string, { best: number; count: number }>();
      
      (data || []).forEach((score) => {
        const existing = playerMap.get(score.player_name);
        if (existing) {
          existing.best = Math.max(existing.best, Number(score.total_score));
          existing.count++;
        } else {
          playerMap.set(score.player_name, { best: Number(score.total_score), count: 1 });
        }
      });

      const aggregated: AggregatedScore[] = Array.from(playerMap.entries())
        .map(([name, data]) => ({
          player_name: name,
          best_score: data.best,
          games_played: data.count
        }))
        .sort((a, b) => b.best_score - a.best_score);

      setScores(aggregated);
    } catch (error) {
      setFetchError(true);
      console.error('Error fetching contest scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScores = scores.filter(score =>
    score.player_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const rankedScores = scores.map((score) => ({ total_score: score.best_score }));
  const currentPlayerScore = scores.find((s) => s.player_name.toLowerCase() === currentPlayerName?.toLowerCase());
  const currentPlayerRank = currentPlayerScore ? performanceRank(currentPlayerScore.best_score, rankedScores) : 0;

  const getMedalColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-amber-600";
    return "";
  };

  return (
    <Card className="w-full min-w-0 h-full border-2 border-primary shadow-lg shadow-primary/20 flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <CardTitle className="text-xl text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              {contest.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {contest.status === 'expired' ? 'Final Standings' : 'Live Stats'}
              {' • '}{scores.length} participant{scores.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="min-w-0 flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-input border-border"
          />
        </div>

        {currentPlayerName && currentPlayerRank > 0 && (
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
            <p className="text-sm font-medium">
              Your Rank: <span className="text-primary">#{currentPlayerRank}</span>
            </p>
          </div>
        )}

        <div className="flex-1 overflow-auto max-h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : fetchError ? (
            <div className="text-center py-8"><p className="text-muted-foreground">Stats could not be loaded.</p><Button variant="outline" onClick={() => void fetchScores()}>Try again</Button></div>
          ) : filteredScores.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchQuery ? "No matching players found" : "No scores yet"}
            </p>
          ) : (
            <div className="space-y-2 pr-1 sm:pr-4">
              <div className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-3 py-2 text-[10px] sm:text-xs font-semibold text-muted-foreground border-b border-border"><span className="w-8">Rank</span><span className="flex-[1.2]">Player</span><span className="flex-1 text-center">Score</span><span className="w-[64px] sm:flex-1 text-center">Certificate</span></div>
              {filteredScores.map((score, index) => {
                const rank = performanceRank(score.best_score, rankedScores);
                const isCurrentPlayer = score.player_name.toLowerCase() === currentPlayerName?.toLowerCase();
                
                return (
                  <div
                    key={score.player_name}
                    className={`flex items-center gap-1.5 sm:gap-3 p-2 sm:p-3 rounded-lg text-xs sm:text-base ${
                      isCurrentPlayer ? "bg-primary/10 border border-primary/30" : "bg-muted"
                    }`}
                  >
                    <div className="w-8 text-center font-bold">
                      {rank <= 3 ? (
                        <Medal className={`w-5 h-5 mx-auto ${getMedalColor(rank)}`} />
                      ) : (
                        <span className="text-muted-foreground">#{rank}</span>
                      )}
                    </div>
                    <div className="flex-[1.2] min-w-0">
                      <p className={`font-medium truncate ${isCurrentPlayer ? "text-primary" : "text-foreground"}`}>
                        {score.player_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {score.games_played} game{score.games_played !== 1 ? 's' : ''} played
                      </p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="font-bold text-sm sm:text-lg">{score.best_score.toFixed(2)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">best score</p>
                    </div>
                    <div className="w-[64px] sm:flex-1 shrink-0"><CertificateActions disabled={!isCurrentPlayer} playerName={score.player_name} score={score.best_score} contestId={contest.id} contestName={contest.name} contestRank={rank} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
