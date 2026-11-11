import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface HandoffScreenProps {
  nextPlayer: 1 | 2;
  nextPlayerName?: string;
  onReady: () => void;
  disabled?: boolean;
}

export const HandoffScreen = ({ nextPlayer, nextPlayerName, onReady, disabled = false }: HandoffScreenProps) => {
  const displayName = nextPlayerName || `Player ${nextPlayer}`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'transparent' }}>
      <Card className="p-12 border-primary max-w-lg text-center space-y-6 shadow-2xl" style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Pass Device</h2>
          <p className="text-muted-foreground">
            Hand the device to the next player
          </p>
        </div>

        <div className="py-8">
          <div
            className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-6xl font-bold ${
              nextPlayer === 1
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            P{nextPlayer}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-2xl font-bold text-foreground">
            {displayName}'s Turn
          </p>
          <p className="text-sm text-muted-foreground">
            Click ready when you're prepared to begin sampling
          </p>
        </div>

        <Button
          onClick={onReady}
          disabled={disabled}
          className="w-full bg-gradient-accent hover:opacity-90 text-primary-foreground font-semibold text-xl py-8"
        >
          Ready to Play
        </Button>
      </Card>
    </div>
  );
};
