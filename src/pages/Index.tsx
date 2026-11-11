import { useState } from "react";
import { GameState, RoundData } from "@/types/game";
import {
  generateDotsWithVariableDensity,
  calculateLocalDensity,
  calculateActualDensity,
  calculateStandardDeviation,
  calculateScore,
} from "@/utils/boardGenerator";
import { GameBoard } from "@/components/GameBoard";
import { SampleInfo } from "@/components/SampleInfo";
import { GuessInput } from "@/components/GuessInput";
import { RoundResult } from "@/components/RoundResult";
import { RoundHistory } from "@/components/RoundHistory";
import { HandoffScreen } from "@/components/HandoffScreen";
import { GameComplete } from "@/components/GameComplete";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

const BOARD_SIZE = 1000;
const MIN_DOTS = 25000;
const MAX_DOTS = 100000;
const SAMPLES_PER_ROUND = 5;
const TOTAL_ROUNDS = 7; // Each player plays 7 rounds (14 total)
const SAMPLE_RADIUS = BOARD_SIZE / (5 * Math.sqrt(Math.PI)); // 1/25th of board area

const generateRandomDotCount = () => {
  return Math.floor(MIN_DOTS + Math.random() * (MAX_DOTS - MIN_DOTS));
};

const Index = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    return {
      currentPlayer: 1,
      currentRound: 1,
      phase: "setup",
      dots: [],
      boardSize: BOARD_SIZE,
      totalDots: 0,
      samplesRemaining: SAMPLES_PER_ROUND,
      rounds: [],
      currentRoundData: {},
      player1Name: undefined,
      player2Name: undefined,
    };
  });

  // Pre-generate next board for instant handoff
  const [nextBoard, setNextBoard] = useState<{
    dots: Array<{ x: number; y: number }>;
    totalDots: number;
    actualDensity: number;
    standardDeviation: number;
  } | null>(null);

  const handleSample = (x: number, y: number) => {
    if (gameState.phase !== "sampling" || gameState.samplesRemaining <= 0)
      return;

    const localDensity = calculateLocalDensity(
      gameState.dots,
      x,
      y,
      SAMPLE_RADIUS
    );

    const newSamples = [
      ...(gameState.currentRoundData.samples || []),
      { x, y, radius: SAMPLE_RADIUS, localDensity },
    ];

    setGameState({
      ...gameState,
      samplesRemaining: gameState.samplesRemaining - 1,
      currentRoundData: {
        ...gameState.currentRoundData,
        samples: newSamples,
      },
      phase: gameState.samplesRemaining === 1 ? "guessing" : "sampling",
    });
  };

  const handleGuess = (guess: number) => {
    const score = calculateScore(
      guess,
      gameState.currentRoundData.actualDensity!,
      gameState.currentRoundData.standardDeviation!
    );

    const completedRound: RoundData = {
      playerNumber: gameState.currentPlayer,
      samples: gameState.currentRoundData.samples || [],
      guess,
      actualDensity: gameState.currentRoundData.actualDensity!,
      standardDeviation: gameState.currentRoundData.standardDeviation!,
      score,
    };

    setGameState({
      ...gameState,
      phase: "reveal",
      currentRoundData: completedRound,
      rounds: [...gameState.rounds, completedRound],
    });
  };

  const handleContinue = () => {
    // Check if game is complete (both players completed all rounds)
    if (gameState.rounds.length >= TOTAL_ROUNDS * 2) {
      setGameState({ ...gameState, phase: "complete" });
      return;
    }
    
    // Determine next player and round
    // After Player 1: Player 2 plays (same round)
    // After Player 2: Player 1 plays (next round)
    const isPlayer1Turn = gameState.currentPlayer === 1;
    const nextPlayer = isPlayer1Turn ? 2 : 1;
    const nextRound = isPlayer1Turn ? gameState.currentRound : gameState.currentRound + 1;
    
    // Pre-generate next board in background
    setTimeout(() => {
      const totalDots = generateRandomDotCount();
      const dots = generateDotsWithVariableDensity(totalDots, BOARD_SIZE);
      const actualDensity = calculateActualDensity(totalDots, BOARD_SIZE);
      const standardDeviation = calculateStandardDeviation(dots, BOARD_SIZE);
      setNextBoard({ dots, totalDots, actualDensity, standardDeviation });
    }, 0);
    
    setGameState({
      ...gameState,
      phase: "handoff",
      currentPlayer: nextPlayer,
      currentRound: nextRound,
    });
  };

  const handleHandoffReady = () => {
    // Use pre-generated board if available, otherwise generate new one
    let dots, totalDots, actualDensity, standardDeviation;
    
    if (nextBoard) {
      ({ dots, totalDots, actualDensity, standardDeviation } = nextBoard);
      setNextBoard(null);
    } else {
      totalDots = generateRandomDotCount();
      dots = generateDotsWithVariableDensity(totalDots, BOARD_SIZE);
      actualDensity = calculateActualDensity(totalDots, BOARD_SIZE);
      standardDeviation = calculateStandardDeviation(dots, BOARD_SIZE);
    }

    setGameState({
      ...gameState,
      phase: "sampling",
      dots,
      totalDots,
      samplesRemaining: SAMPLES_PER_ROUND,
      currentRoundData: {
        playerNumber: gameState.currentPlayer,
        samples: [],
        actualDensity,
        standardDeviation,
        score: 0,
      },
    });
  };

  const handleStartGame = (player1Name: string, player2Name: string) => {
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
        actualDensity,
        standardDeviation,
        score: 0,
      },
      player1Name,
      player2Name,
    });
  };

  const handleNewGame = () => {
    setGameState({
      currentPlayer: 1,
      currentRound: 1,
      phase: "setup",
      dots: [],
      boardSize: BOARD_SIZE,
      totalDots: 0,
      samplesRemaining: SAMPLES_PER_ROUND,
      rounds: [],
      currentRoundData: {},
      player1Name: undefined,
      player2Name: undefined,
    });
  };

  if (gameState.phase === "setup") {
    return <WelcomeScreen onStart={handleStartGame} />;
  }

  if (gameState.phase === "complete") {
    return (
      <GameComplete
        rounds={gameState.rounds}
        onNewGame={handleNewGame}
        player1Name={gameState.player1Name}
        player2Name={gameState.player2Name}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-board p-4 relative">
      {gameState.phase === "handoff" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto">
          <HandoffScreen
            nextPlayer={gameState.currentPlayer}
            nextPlayerName={
              gameState.currentPlayer === 1
                ? gameState.player1Name
                : gameState.player2Name
            }
            onReady={handleHandoffReady}
          />
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <Card className="p-0 bg-card border-2 border-primary shadow-lg shadow-primary/20 overflow-hidden">
          <div className="grid grid-cols-3 gap-0">
            {/* Player 1 Section */}
            <div className={`p-4 transition-colors ${
              gameState.currentPlayer === 1 
                ? "bg-blue-500/20" 
                : "bg-card"
            }`}>
              <div className="text-sm text-muted-foreground mb-1">
                {gameState.player1Name || "Player 1"}
              </div>
              <div className="text-3xl font-bold font-mono text-foreground">
                {gameState.rounds
                  .filter(r => r.playerNumber === 1)
                  .reduce((sum, r) => sum + r.score, 0)
                  .toFixed(1)}
              </div>
            </div>

            {/* Center Section - Game Name and Round */}
            <div className="p-4 flex flex-col items-center justify-center text-center border-x border-border">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                Indexsis
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Round {gameState.currentRound} of {TOTAL_ROUNDS}
              </p>
            </div>

            {/* Player 2 Section */}
            <div className={`p-4 transition-colors ${
              gameState.currentPlayer === 2 
                ? "bg-blue-500/20" 
                : "bg-card"
            }`}>
              <div className="text-sm text-muted-foreground mb-1">
                {gameState.player2Name || "Player 2"}
              </div>
              <div className="text-3xl font-bold font-mono text-foreground">
                {gameState.rounds
                  .filter(r => r.playerNumber === 2)
                  .reduce((sum, r) => sum + r.score, 0)
                  .toFixed(1)}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Main Board */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4 bg-card border-primary">
              <GameBoard
                dots={gameState.dots}
                boardSize={gameState.boardSize}
                samples={gameState.currentRoundData.samples || []}
                showDots={gameState.phase === "reveal"}
                onSample={handleSample}
                canSample={gameState.phase === "sampling"}
              />
              {gameState.phase === "sampling" && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Touch the covered board to take samples
                </p>
              )}
            </Card>

          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            <GuessInput 
              onSubmit={handleGuess} 
              disabled={gameState.phase !== "guessing"}
            />

            <Card className="p-4 bg-card border-primary">
              <SampleInfo
                samples={gameState.currentRoundData.samples || []}
                samplesRemaining={gameState.samplesRemaining}
              />
            </Card>

            <Card className="p-4 bg-card border-primary">
              <RoundHistory
                rounds={gameState.rounds}
                player1Name={gameState.player1Name}
                player2Name={gameState.player2Name}
              />
            </Card>
          </div>
        </div>
      </div>

      {/* Round Result Dialog */}
      <Dialog open={gameState.phase === "reveal"}>
        <DialogContent className="max-w-2xl">
          <RoundResult
            roundData={gameState.currentRoundData as RoundData}
            onContinue={handleContinue}
            showContinue={true}
            isRoundComplete={gameState.currentPlayer === 2}
            nextPlayerName={
              gameState.currentPlayer === 1
                ? gameState.player2Name || "Player 2"
                : gameState.player1Name || "Player 1"
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
