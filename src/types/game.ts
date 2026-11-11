export interface Dot {
  x: number;
  y: number;
}

export interface Sample {
  x: number;
  y: number;
  radius: number;
  localDensity: number;
}

export interface RoundData {
  playerNumber: 1 | 2;
  samples: Sample[];
  guess: number | null;
  actualDensity: number;
  standardDeviation: number;
  score: number;
}

export interface GameState {
  currentPlayer: 1 | 2;
  currentRound: number;
  phase: 'setup' | 'sampling' | 'guessing' | 'reveal' | 'handoff' | 'complete';
  dots: Dot[];
  boardSize: number;
  totalDots: number;
  samplesRemaining: number;
  rounds: RoundData[];
  currentRoundData: Partial<RoundData>;
  player1Name?: string;
  player2Name?: string;
}
