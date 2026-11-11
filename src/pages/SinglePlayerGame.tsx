import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GameBoard } from "@/components/GameBoard";
import { GuessInput } from "@/components/GuessInput";
import { SampleInfo } from "@/components/SampleInfo";
import { RoundResult } from "@/components/RoundResult";
import { Leaderboard } from "@/components/Leaderboard";
import { PlayerProfile } from "@/components/PlayerProfile";
import { ContestLeaderboard } from "@/components/ContestLeaderboard";
import { ContestWithParticipants } from "@/types/contest";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, X, Crown, Award, Trophy, TrendingUp, ArrowRight, BarChart3 } from "lucide-react";
import { fetchGlobalScores } from "@/utils/statsQueries";
import { ordinal, performanceRank } from "@/utils/performanceStats";
import { AnnouncementOverlay } from "@/components/AnnouncementOverlay";
import { GameState } from "@/types/game";
import {
  generateDotsWithVariableDensity,
  calculateLocalDensity,
  calculateActualDensity,
  calculateStandardDeviation,
  calculateScore,
} from "@/utils/boardGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { readPlayerSession, savePlayerSession } from "@/utils/playerSession";

import { useGameplayTracking } from "@/hooks/useGameplayTracking";
import { GameTutorial } from "@/components/GameTutorial";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { markGuideSeen, shouldAutoShowGuide } from "@/utils/gameGuide";

const BOARD_SIZE = 600;
const TOTAL_ROUNDS = 7;
const SAMPLES_PER_ROUND = 5;
const SAMPLE_RADIUS = 50;

const generateRandomDotCount = () => Math.floor(Math.random() * 75001) + 25000;

export default function SinglePlayerGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [savedPlayer] = useState(readPlayerSession);
  const [playerName, setPlayerName] = useState(location.state?.playerName || savedPlayer?.username || "Player");
  const playerId = location.state?.playerId || savedPlayer?.id || null;
  const contestId = location.state?.contestId || null;
  const contestName = location.state?.contestName || "The Global Estimator Challenge";

  const [activeTab, setActiveTab] = useState<"play" | "profile" | "stats">("play");
  const { guideSteps } = useAdminSettings();
  const [guideOpen, setGuideOpen] = useState(() => shouldAutoShowGuide(window.localStorage));
  const closeGuide = () => { markGuideSeen(window.localStorage); setGuideOpen(false); };
  const [gameState, setGameState] = useState<GameState>(() => {
    const totalDots = generateRandomDotCount();
    const dots = generateDotsWithVariableDensity(totalDots, BOARD_SIZE);
    const actualDensity = calculateActualDensity(totalDots, BOARD_SIZE);
    const standardDeviation = calculateStandardDeviation(dots, BOARD_SIZE);

    return {
      currentPlayer: 1,
      currentRound: 1,
      phase: "sampling",
      dots,
      boardSize: BOARD_SIZE,
      totalDots,
      samplesRemaining: SAMPLES_PER_ROUND,
      rounds: [],
      currentRoundData: {
        playerNumber: 1,
        samples: [],
        guess: null,
        actualDensity,
        standardDeviation,
        score: 0,
      },
      player1Name: playerName,
    };
  });

  const [showResult, setShowResult] = useState(false);
  const [gameCompleteDialog, setGameCompleteDialog] = useState(false);
  const [isTopScore, setIsTopScore] = useState(false);
  const [resultStats, setResultStats] = useState<null | { score: number; firstMatch: boolean; submitted: boolean; highestScore: number; highestRank: number | null; currentRank: number }>(null);
  const submittingRef = useRef(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const isProcessingRef = useRef(false);

  const tracking = useGameplayTracking({ active: activeTab === "play" && ["sampling", "guessing"].includes(gameState.phase) && !showBackConfirm && !showRestartConfirm, playerId, playerKey: playerId ?? playerName, contestId, round: gameState.currentRound, completedRounds: gameState.rounds.length });

  // Mobile back button/gesture intercept
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      setShowBackConfirm(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (gameState.phase === "sampling") {
      setShowResult(false);
      isProcessingRef.current = false;
    } else if (gameState.phase === "complete") {
      isProcessingRef.current = false;
    }
  }, [gameState.phase]);

  const handleSample = (x: number, y: number) => {
    if (gameState.phase !== "sampling" || gameState.samplesRemaining <= 0) return;

    const localDensity = calculateLocalDensity(gameState.dots, x, y, SAMPLE_RADIUS);
    const newSample = { x, y, radius: SAMPLE_RADIUS, localDensity };

    const updatedSamples = [...(gameState.currentRoundData.samples || []), newSample];
    const newSamplesRemaining = gameState.samplesRemaining - 1;

    setGameState({
      ...gameState,
      samplesRemaining: newSamplesRemaining,
      phase: newSamplesRemaining === 0 ? "guessing" : "sampling",
      currentRoundData: {
        ...gameState.currentRoundData,
        samples: updatedSamples,
      },
    });
  };

  const handleGuess = (guess: number) => {
    const { actualDensity, standardDeviation } = gameState.currentRoundData;
    if (actualDensity === undefined || standardDeviation === undefined) return;
    const score = calculateScore(
      guess,
      actualDensity,
      standardDeviation
    );

    const completedRound = {
      playerNumber: 1 as 1 | 2,
      samples: gameState.currentRoundData.samples || [],
      guess,
      actualDensity,
      standardDeviation,
      score,
    };

    setGameState({
      ...gameState,
      phase: "reveal",
      rounds: [...gameState.rounds, completedRound],
      currentRoundData: completedRound,
    });

    setShowResult(true);
  };

  const handleContinue = () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    if (gameState.currentRound >= TOTAL_ROUNDS) {
      const totalScore = gameState.rounds.reduce((sum, r) => sum + r.score, 0);
      setGameState((prev) => ({ ...prev, phase: "complete" }));
      setShowResult(false);
      saveScore(totalScore);
      return;
    }

    const totalDots = generateRandomDotCount();
    const dots = generateDotsWithVariableDensity(totalDots, BOARD_SIZE);
    const actualDensity = calculateActualDensity(totalDots, BOARD_SIZE);
    const standardDeviation = calculateStandardDeviation(dots, BOARD_SIZE);

    setGameState((prev) => ({
      ...prev,
      currentRound: prev.currentRound + 1,
      phase: "sampling",
      dots,
      totalDots,
      samplesRemaining: SAMPLES_PER_ROUND,
      currentRoundData: {
        playerNumber: 1,
        samples: [],
        guess: null,
        actualDensity,
        standardDeviation,
        score: 0,
      },
    }));
  };

  const buildScoreInsert = (totalScore: number) => {
    const scoreInsert: any = {
      player_name: playerName,
      total_score: totalScore,
      duration_seconds: tracking.durationSeconds(),
      analytics_match_id: tracking.matchId,
    };
    if (playerId) scoreInsert.player_id = playerId;
    if (contestId) {
      scoreInsert.contest_id = contestId;
      scoreInsert.contest_name = contestName;
    }
    return scoreInsert;
  };

  const submitGlobalScore = async () => {
    if (submittingRef.current || !resultStats || resultStats.submitted) return;
    submittingRef.current = true;
    setResultStats((prev) => prev && { ...prev, submitted: true });
    const error = await insertScores(resultStats.score);
    if (error) {
      console.error("Error saving score:", error);
      submittingRef.current = false;
      setResultStats((prev) => prev && { ...prev, submitted: false });
      toast({ title: "Error", description: "Failed to submit score. Please try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Score submitted", description: contestId ? "Your score is now on the Contest and Global Rankings." : "Your score is now on the Global Rankings." });
  };

  const insertScores = async (totalScore: number) => {
    if (contestId) {
      const contestInsert: any = { contest_id: contestId, player_name: playerName, total_score: totalScore };
      if (playerId) contestInsert.player_id = playerId;
      const { error: contestError } = await supabase.from("contest_scores").insert(contestInsert);
      if (contestError) return contestError;
    }
    const { error } = await supabase.from("scores").insert(buildScoreInsert(totalScore));
    return error;
  };

  const saveScore = async (totalScore: number) => {
    try {
      let allScores: any[];
      if (contestId) {
        const { data, error } = await supabase.from("contest_scores").select("*").eq("contest_id", contestId);
        if (error) throw error;
        allScores = data ?? [];
      } else allScores = await fetchGlobalScores();
      const own = allScores.filter((sc) => (playerId && sc.player_id ? sc.player_id === playerId : sc.player_name === playerName));
      const firstMatch = own.length === 0;
      const best = own.reduce((m, sc) => Math.max(m, Number(sc.total_score)), -Infinity);
      const bestEntry = own.find((sc) => Number(sc.total_score) === best);
      const stats = {
        score: totalScore,
        firstMatch,
        submitted: firstMatch,
        highestScore: firstMatch ? totalScore : Math.max(best, 0),
        highestRank: firstMatch ? null : performanceRank(best, allScores, bestEntry?.created_at),
        currentRank: performanceRank(totalScore, allScores, "9999"),
      };
      if (stats.highestRank === null) stats.highestRank = stats.currentRank;
      setIsTopScore(!firstMatch && totalScore > best);
      submittingRef.current = firstMatch;

      if (firstMatch) {
        const insertError = await insertScores(totalScore);
        if (insertError) throw insertError;
      }

      setResultStats(stats);
      setGameCompleteDialog(true);
    } catch (error) {
      console.error("Error saving score:", error);
      toast({
        title: "Error",
        description: "Failed to save score. Please try again.",
        variant: "destructive",
      });
    }
  };

  const closeResult = () => { setGameCompleteDialog(false); setResultStats(null); submittingRef.current = false; };

  const handleNewGame = () => {
    tracking.reset();
    const totalDots = generateRandomDotCount();
    const dots = generateDotsWithVariableDensity(totalDots, BOARD_SIZE);
    const actualDensity = calculateActualDensity(totalDots, BOARD_SIZE);
    const standardDeviation = calculateStandardDeviation(dots, BOARD_SIZE);

    setGameState({
      currentPlayer: 1,
      currentRound: 1,
      phase: "sampling",
      dots,
      boardSize: BOARD_SIZE,
      totalDots,
      samplesRemaining: SAMPLES_PER_ROUND,
      rounds: [],
      currentRoundData: {
        playerNumber: 1,
        samples: [],
        guess: null,
        actualDensity,
        standardDeviation,
        score: 0,
      },
      player1Name: playerName,
    });
    setGameCompleteDialog(false);
    setActiveTab("play");
  };

  const handleNameChange = (newName: string) => {
    setPlayerName(newName);
    if (playerId) savePlayerSession({ id: playerId, username: newName });
  };

  const totalScore = gameState.rounds.reduce((sum, r) => sum + r.score, 0);

  const canAdvanceRound = gameState.phase === "reveal" && !showResult;
  const NextRoundButton = (
    <Button
      onClick={handleContinue}
      disabled={!canAdvanceRound}
      className={`bg-primary text-primary-foreground font-semibold transition-opacity ${
        canAdvanceRound ? "opacity-100 hover:opacity-90" : "opacity-40"
      }`}
      size="sm"
    >
      Next round
    </Button>
  );
  const GuideLink = <Button variant="link" className="h-auto p-0 text-xs text-muted-foreground font-normal" onClick={() => setGuideOpen(true)}>How to play?</Button>;
  const RematchButton = (
    <Button onClick={() => setShowRestartConfirm(true)} className="w-full">
      <RotateCcw className="w-4 h-4 mr-2" />Rematch
    </Button>
  );

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 relative">
      <AnnouncementOverlay targetScreen="single-player-game" />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowBackConfirm(true)}
        className="absolute top-4 left-4"
      >
        <ArrowLeft className="w-6 h-6" />
      </Button>
      <div className="max-w-7xl mx-auto space-y-2 sm:space-y-4">
        {/* Header */}
        <div className="flex flex-col items-center justify-center py-4 sm:py-6 space-y-2 sm:space-y-3">
          <button
            onClick={() => navigate("/")}
            className="text-2xl sm:text-3xl font-bold text-foreground hover:text-primary transition-colors"
          >
            Indexsis
          </button>
          
          <p className="text-sm text-primary font-medium">
            {contestName}
          </p>

          <div className="flex gap-2">
            <Button
              variant={activeTab === "play" ? "default" : "outline"}
              onClick={() => setActiveTab("play")}
              className="px-6 sm:px-8 text-sm sm:text-base"
            >
              Play
            </Button>
            <Button
              variant={activeTab === "profile" ? "default" : "outline"}
              onClick={() => setActiveTab("profile")}
              className="px-6 sm:px-8 text-sm sm:text-base"
            >
              Profile
            </Button>
            <Button
              variant={activeTab === "stats" ? "default" : "outline"}
              onClick={() => setActiveTab("stats")}
              className="px-6 sm:px-8 text-sm sm:text-base"
            >
              Stats
            </Button>
          </div>
        </div>

        {activeTab === "play" ? (
          <div className="grid lg:grid-cols-[1fr,320px] xl:grid-cols-[1fr,400px] gap-2 sm:gap-4 lg:items-start">
            {/* Player Info - shown above board on mobile */}
            <div className="lg:hidden order-first space-y-2">
              {gameState.phase === "complete" && RematchButton}
            <Card data-guide="round" className="p-3 sm:p-4 bg-card border-primary">
              <div className="grid grid-cols-[minmax(0,1fr),auto,minmax(0,1fr)] items-center gap-2">
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm text-muted-foreground break-words">{playerName}</div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
                    {totalScore.toFixed(2)}
                  </div>
                </div>
                  <div className="text-xs sm:text-sm text-muted-foreground text-center whitespace-nowrap">
                    Round {gameState.currentRound} of {TOTAL_ROUNDS}
                  </div>
                <div className="flex flex-col items-end gap-2">
                  {NextRoundButton}{GuideLink}
                </div>
              </div>
            </Card>
            </div>

            {/* Game Board */}
            <Card data-guide="board" className="p-3 sm:p-6 bg-card border-primary">
              <GameBoard
                adAudience={tracking.audience}
                onVisibleCampaigns={tracking.onVisibleCampaigns}
                dots={gameState.dots}
                boardSize={gameState.boardSize}
                samples={gameState.currentRoundData.samples || []}
                showDots={gameState.phase === "reveal"}
                onSample={handleSample}
                canSample={gameState.phase === "sampling" && gameState.samplesRemaining > 0}
              />
            </Card>

            {/* Right Sidebar */}
            <div className="space-y-2 sm:space-y-4">
              {/* Player Info - desktop only */}
              {gameState.phase === "complete" && <div className="hidden lg:block">{RematchButton}</div>}
              <Card data-guide="round" className="p-3 sm:p-4 bg-card border-primary hidden lg:block">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 sm:space-y-2">
                    <div className="text-xs sm:text-sm text-muted-foreground">{playerName}</div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
                      {totalScore.toFixed(2)}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Round {gameState.currentRound} of {TOTAL_ROUNDS}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2 self-stretch justify-end">{NextRoundButton}{GuideLink}</div>
                </div>
              </Card>

              <div data-guide="guess"><GuessInput 
                onSubmit={handleGuess}
                disabled={gameState.phase !== "guessing"}
              /></div>

              <div data-guide="samples"><SampleInfo
                samplesRemaining={gameState.samplesRemaining}
                samples={gameState.currentRoundData.samples || []}
              /></div>

              <Card data-guide="history" className="p-3 sm:p-4 bg-card border-primary">
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-2 sm:mb-3">Game History</h3>
                <div className="space-y-2 max-h-[200px] sm:max-h-[300px] overflow-y-auto">
                  {gameState.rounds.map((round, index) => (
                    <div
                      key={index}
                      className="p-2 sm:p-3 bg-muted/50 rounded-lg text-xs sm:text-sm"
                    >
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Round {index + 1}</span>
                        <span className="font-mono font-bold text-foreground">
                          {round.score.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {gameState.phase !== "complete" && <Button
                variant="destructive"
                onClick={() => setShowRestartConfirm(true)}
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restart Match
              </Button>}
            </div>
          </div>
        ) : activeTab === "profile" ? (
          playerId ? (
            <PlayerProfile
              playerId={playerId}
              playerName={playerName}
              onNameChange={handleNameChange}
            />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Profile is available for registered players only.</p>
            </Card>
          )
        ) : contestId ? (
          <div className="grid md:grid-cols-2 gap-6">
            <ContestLeaderboard
              contest={{
                id: contestId,
                name: contestName,
                passcode_hash: '',
                duration_minutes: 0,
                participant_limit: 100,
                starts_at: '',
                ends_at: '',
                status: 'active',
                created_at: '',
                participant_count: 0,
              } as ContestWithParticipants}
              currentPlayerName={playerName}
              onBack={() => setActiveTab("play")}
            />
            <Leaderboard currentPlayerName={playerName} hideHistory />
          </div>
        ) : (
          <Leaderboard currentPlayerName={playerName} hideHistory />
        )}
      </div>

      {guideOpen && activeTab === "play" && !showResult && !showBackConfirm && !showRestartConfirm && !gameCompleteDialog && <GameTutorial steps={guideSteps} onClose={closeGuide} />}

      {/* Round Result floating card (no backdrop; gameboard remains scrollable) */}
      {showResult && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-[92vw] max-w-md sm:w-[420px] pointer-events-auto">
          <RoundResult
            roundData={gameState.currentRoundData as any}
            onContinue={handleContinue}
            showContinue={true}
            isRoundComplete={gameState.currentRound >= TOTAL_ROUNDS}
            nextPlayerName={playerName}
            disabled={gameState.phase !== "reveal"}
            onClose={() => setShowResult(false)}
            continueLabel="Next round"
          />
        </div>
      )}

      {/* Game Complete Dialog */}
      <Dialog open={gameCompleteDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <button type="button" aria-label="Close" onClick={closeResult} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 text-muted-foreground"><X className="w-5 h-5" /></button>
          <div className="space-y-5 text-center">
            <h2 className="text-2xl font-bold text-foreground">Game Completed</h2>
            {isTopScore && <div className="text-lg font-bold text-primary animate-pulse">🎉 New Personal Best! 🎉</div>}
            <div className="relative rounded-xl border-2 border-primary/60 bg-primary/5 p-5 shadow-[0_0_24px_hsl(var(--primary)/0.35)]">
              <Crown className="w-6 h-6 text-primary mx-auto mb-1" />
              <p className="text-muted-foreground flex items-center justify-center gap-2"><Award className="w-4 h-4" />Your Final Score:</p>
              <p className="text-5xl font-bold font-mono text-primary mt-2">{totalScore.toFixed(2)}</p>
            </div>
            {resultStats && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Trophy, label: "Highest Rank", value: resultStats.highestRank ? ordinal(resultStats.highestRank) : "—" },
                  { icon: Award, label: "Highest Score", value: resultStats.highestScore.toFixed(2) },
                  { icon: TrendingUp, label: "Current Rank", value: ordinal(resultStats.currentRank) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-lg border border-border bg-card p-3">
                    <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold font-mono text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            )}
            {resultStats && !resultStats.firstMatch && (
              <Button onClick={submitGlobalScore} disabled={resultStats.submitted} className="w-full">
                {resultStats.submitted ? (contestId ? "Submitted to Contest Rankings" : "Submitted to Global Rankings") : <>{contestId ? "Enter Contest Rankings" : "Enter Global Rankings"}<ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            )}
            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={() => { closeResult(); setShowRestartConfirm(true); }}><RotateCcw className="w-4 h-4 mr-2" />Rematch</Button>
              <Button variant="outline" className="w-full" onClick={() => { closeResult(); setActiveTab("stats"); }}><BarChart3 className="w-4 h-4 mr-2" />View Stats</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restart Confirmation Dialog */}
      <Dialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-bold text-foreground">{gameState.phase === "complete" ? "Rematch?" : "Restart Match?"}</h2>
            <p className="text-muted-foreground">
              {gameState.phase === "complete" ? "Better luck this time!" : "This will reset your current game. Your score won't be saved."}
            </p>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setShowRestartConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleNewGame();
                  setShowRestartConfirm(false);
                }}
                className="flex-1"
              >
                {gameState.phase === "complete" ? "Rematch" : "Restart"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Back Confirmation Dialog */}
      <Dialog open={showBackConfirm} onOpenChange={setShowBackConfirm}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-bold text-foreground">Leave Game?</h2>
            <p className="text-muted-foreground">
              This will end the current game and take you back to player setup.{gameState.phase !== "complete" && " Your progress won't be saved."}
            </p>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setShowBackConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setShowBackConfirm(false);
                  navigate("/single-player-setup");
                }}
                className="flex-1"
              >
                Leave Game
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
