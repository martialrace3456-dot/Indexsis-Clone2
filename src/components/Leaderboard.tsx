import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CertificateActions } from "@/components/CertificateActions";
import { fetchGlobalScores } from "@/utils/statsQueries";
import { performanceRank } from "@/utils/performanceStats";
import { useToast } from "@/hooks/use-toast";

interface Score {
  id: string;
  player_name: string;
  total_score: number;
  game_date: string;
  contest_name: string | null;
  show_contest: boolean;
  contest_id: string | null;
  created_at?: string;
}

interface LeaderboardProps {
  currentPlayerName: string;
  hideHistory?: boolean;
}

export const Leaderboard = ({ currentPlayerName, hideHistory = false }: LeaderboardProps) => {
  const [globalScores, setGlobalScores] = useState<Score[]>([]);
  const [personalScores, setPersonalScores] = useState<Score[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedScore, setSelectedScore] = useState<Score | null>(null);
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetchScores();
  }, [currentPlayerName]);

  const fetchScores = async () => {
    setLoading(true);
    
    setFetchError(false);
    try {
      const data = await fetchGlobalScores();
      setGlobalScores(data);
      setPersonalScores(data.filter((score) => score.player_name === currentPlayerName));
    } catch { setFetchError(true); }
    finally { setLoading(false); }
  };

  const filteredGlobalScores = globalScores.filter((score) =>
    score.player_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleScoreClick = (score: Score) => {
    if (score.player_name !== currentPlayerName || !score.contest_id) return;
    setSelectedScore(score);
  };

  const updateContest = async (values: { show_contest: boolean; contest_id?: null; contest_name?: null }) => {
    if (!selectedScore || updating) return;
    setUpdating(true);
    const { error } = await supabase.from("scores").update(values).eq("id", selectedScore.id);
    setUpdating(false);
    if (error) { toast({ title: "Contest name could not be updated", description: error.message, variant: "destructive" }); return; }
    setSelectedScore(null);
    void fetchScores();
  };

  const isGlobalChallenge = !selectedScore?.contest_id;

  return (
    <div className={hideHistory ? "min-w-0" : "grid md:grid-cols-2 gap-6 min-w-0"}>
      {/* Global Rankings */}
      <Card className="min-w-0 bg-card/50 border-primary/50">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground mb-4">Global Rankings</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="text"
              placeholder="Search Player..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-auto">
            <div className="grid grid-cols-[32px,minmax(0,1.2fr),minmax(44px,1fr),64px] sm:grid-cols-[52px,minmax(120px,1.2fr),minmax(80px,1fr),minmax(110px,1fr)] gap-1.5 sm:gap-3 px-1 sm:px-2 py-2 text-[10px] sm:text-sm font-semibold text-muted-foreground border-b border-border">
              <div>Rank</div>
              <div>Player</div>
              <div className="text-center">Score</div>
              <div className="text-center">Certificate</div>
            </div>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : fetchError ? (
              <div className="text-center py-8"><p className="text-muted-foreground">Stats could not be loaded.</p><Button variant="outline" onClick={() => void fetchScores()}>Try again</Button></div>
            ) : (
              filteredGlobalScores.map((score, index) => {
                const isCurrentPlayer = score.player_name === currentPlayerName;
                const rank = performanceRank(Number(score.total_score), globalScores, score.created_at);
                return (
                  <div
                    key={score.id}
                    className={`grid grid-cols-[32px,minmax(0,1.2fr),minmax(44px,1fr),64px] sm:grid-cols-[52px,minmax(120px,1.2fr),minmax(80px,1fr),minmax(110px,1fr)] gap-1.5 sm:gap-3 px-1 sm:px-2 py-2 sm:py-3 text-xs sm:text-base items-center rounded-lg transition-colors ${
                      isCurrentPlayer
                        ? "bg-primary/20 border border-primary"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-mono text-foreground">
                      {rank}.
                    </div>
                    <div className="text-foreground min-w-0">
                      <span className="block truncate">{score.player_name}</span>
                      {score.contest_name && score.contest_id && (score.show_contest || isCurrentPlayer) && (
                        isCurrentPlayer ? <Button
                          variant="link" size="sm" className={`h-auto p-0 text-xs max-w-full whitespace-normal text-left justify-start ${score.show_contest ? "text-primary" : "text-muted-foreground"}`}
                          onClick={() => handleScoreClick(score)} title={score.show_contest ? "Manage contest name" : "Manage hidden contest name"}
                        >[{score.contest_name}]{!score.show_contest && " (hidden)"}</Button> : <span className="text-xs text-primary break-words">
                          [{score.contest_name}]
                        </span>
                      )}
                    </div>
                    <div className="text-center font-mono text-foreground">
                      {score.total_score.toFixed(2)}
                    </div>
                    <CertificateActions disabled={!isCurrentPlayer} playerName={score.player_name} score={Number(score.total_score)} contestId={score.contest_id} contestName={score.contest_name} worldRank={rank} />
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Your History - only shown when hideHistory is false */}
      {!hideHistory && (
        <Card className="bg-card/50 border-primary/50">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">Your History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-sm font-semibold text-muted-foreground border-b border-border">
                <div className="col-span-2">Rank</div>
                <div className="col-span-7">Game Date</div>
                <div className="col-span-3 text-right">Score</div>
              </div>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : personalScores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No games played yet
                </div>
              ) : (
                personalScores.map((score, index) => (
                  <div
                    key={score.id}
                    className="grid grid-cols-12 gap-2 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="col-span-2 font-mono text-foreground">
                      {index + 1}
                    </div>
                    <div className="col-span-7 text-muted-foreground text-sm">
                      {new Date(score.game_date).toLocaleDateString()}
                    </div>
                    <div className="col-span-3 text-right font-mono text-foreground">
                      {score.total_score.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score Popup Dialog */}
      <Dialog open={!!selectedScore} onOpenChange={() => setSelectedScore(null)}>
        <DialogContent className="sm:max-w-md w-[calc(100vw-24px)]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Contest Name</DialogTitle>
          </DialogHeader>
          {selectedScore && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Contest</p>
                <p className="font-bold text-foreground">
                  {selectedScore.contest_name || "The Global Estimator Challenge"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => void updateContest({ show_contest: true })}
                  disabled={isGlobalChallenge || updating}
                  variant="outline"
                  className="flex-1"
                >
                  Show
                </Button>
                <Button
                  onClick={() => void updateContest({ show_contest: false })}
                  disabled={isGlobalChallenge || updating}
                  variant="outline"
                  className="flex-1"
                >
                  Hide
                </Button>
                <Button
                  onClick={() => void updateContest({ contest_id: null, contest_name: null, show_contest: true })}
                  disabled={isGlobalChallenge || updating}
                  variant="destructive"
                  className="flex-1"
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
