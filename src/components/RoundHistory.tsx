import { RoundData } from "@/types/game";
import { Card } from "@/components/ui/card";

interface RoundHistoryProps {
  rounds: RoundData[];
  player1Name?: string;
  player2Name?: string;
}

export const RoundHistory = ({ rounds, player1Name, player2Name }: RoundHistoryProps) => {
  if (rounds.length === 0) return null;

  const player1Rounds = rounds.filter((r) => r.playerNumber === 1);
  const player2Rounds = rounds.filter((r) => r.playerNumber === 2);

  const player1Total = player1Rounds.reduce((sum, r) => sum + r.score, 0);
  const player2Total = player2Rounds.reduce((sum, r) => sum + r.score, 0);

  const displayPlayer1 = player1Name || "Player 1";
  const displayPlayer2 = player2Name || "Player 2";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-foreground">Game History</h3>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">{displayPlayer1}</div>
            <div className="text-2xl font-bold font-mono text-primary">
              {player1Total.toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">{displayPlayer2}</div>
            <div className="text-2xl font-bold font-mono text-secondary">
              {player2Total.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {rounds.map((round, index) => (
          <Card
            key={index}
            className="p-4 bg-card border-border hover:border-primary transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    round.playerNumber === 1
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  P{round.playerNumber}
                </div>
                <span className="text-sm text-muted-foreground">
                  Round {Math.floor(index / 2) + 1}
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-foreground">
                {round.score.toFixed(2)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">Guess</div>
                <div className="font-mono text-foreground">
                  {round.guess?.toFixed(6) || "N/A"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Actual</div>
                <div className="font-mono text-foreground">
                  {round.actualDensity.toFixed(6)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Std Dev</div>
                <div className="font-mono text-foreground">
                  {round.standardDeviation.toFixed(6)}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
