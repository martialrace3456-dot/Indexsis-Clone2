import { RoundData } from "@/types/game";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface RoundResultProps {
  roundData: RoundData;
  onContinue: () => void;
  showContinue: boolean;
  isRoundComplete: boolean;
  nextPlayerName?: string;
  disabled?: boolean;
  onClose?: () => void;
  continueLabel?: string;
}

export const RoundResult = ({
  roundData,
  onContinue,
  showContinue,
  isRoundComplete,
  nextPlayerName,
  disabled = false,
  onClose,
  continueLabel,
}: RoundResultProps) => {
  const difference = Math.abs((roundData.guess || 0) - roundData.actualDensity);
  const accuracyPercentage =
    ((1 - difference / roundData.actualDensity) * 100).toFixed(2);

  return (
    <Card className="relative p-3 bg-card/80 border border-primary/20 space-y-6 rounded-md">
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2 right-2 z-10 rounded-sm p-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="text-center">
        {isRoundComplete ? (
          <h3 className="text-2xl font-bold text-foreground mb-2">
            Round Complete!
          </h3>
        ) : null}
        <div className="inline-block px-6 py-3 bg-gradient-accent rounded-lg">
          <div className="text-sm text-primary-foreground">Score</div>
          <div className="text-4xl font-bold font-mono text-primary-foreground">
            {roundData.score.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-background rounded-lg border border-border">
          <div className="text-xs text-muted-foreground mb-1">Your Guess (ρₐ)</div>
          <div className="text-xl font-bold font-mono text-data-secondary">
            {roundData.guess?.toFixed(6) || "N/A"}
          </div>
        </div>

        <div className="p-4 bg-background rounded-lg border border-border">
          <div className="text-xs text-muted-foreground mb-1">Actual (ρₐ)</div>
          <div className="text-xl font-bold font-mono text-data-primary">
            {roundData.actualDensity.toFixed(6)}
          </div>
        </div>

        <div className="p-4 bg-background rounded-lg border border-border">
          <div className="text-xs text-muted-foreground mb-1">Std Dev (σ)</div>
          <div className="text-xl font-bold font-mono text-warning">
            {roundData.standardDeviation.toFixed(6)}
          </div>
        </div>

        <div className="p-4 bg-background rounded-lg border border-border">
          <div className="text-xs text-muted-foreground mb-1">Accuracy</div>
          <div className="text-xl font-bold font-mono text-success">
            {accuracyPercentage}%
          </div>
        </div>
      </div>

      <div className="p-4 bg-background rounded-lg border border-border">
        <div className="text-xs text-muted-foreground mb-1">Difference</div>
        <div className="text-lg font-mono text-foreground">
          |ρ_guess - ρₐ| = {difference.toFixed(6)}
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          {difference <= roundData.standardDeviation / 9
            ? "Excellent! Within σ/9 of actual density."
            : difference <= roundData.standardDeviation
            ? "Good estimate within σ."
            : "Outside σ - more samples might help next time."}
        </div>
      </div>

      {showContinue && (
        <Button
          onClick={onContinue}
          disabled={disabled}
          className="w-full bg-primary hover:opacity-90 text-primary-foreground font-semibold text-lg py-6"
        >
          {continueLabel ?? (isRoundComplete ? "Continue to Next Round" : (nextPlayerName ? `${nextPlayerName}'s Turn` : "Next round"))}
        </Button>
      )}
    </Card>
  );
};
