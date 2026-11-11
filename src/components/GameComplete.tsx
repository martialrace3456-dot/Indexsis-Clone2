import { useNavigate } from "react-router-dom";
import { RoundData } from "@/types/game";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface GameCompleteProps {
  rounds: RoundData[];
  onNewGame: () => void;
  player1Name?: string;
  player2Name?: string;
  onBack?: () => void;
  backOpen?: boolean;
  onBackOpenChange?: (open: boolean) => void;
}

export const GameComplete = ({ rounds, onNewGame, player1Name, player2Name, onBack, backOpen, onBackOpenChange }: GameCompleteProps) => {
  const navigate = useNavigate();
  const [rematchOpen, setRematchOpen] = useState(false);
  const [localBackOpen, setLocalBackOpen] = useState(false);
  const setBackOpen = onBackOpenChange ?? setLocalBackOpen;
  const displayPlayer1 = player1Name || "Player 1";
  const displayPlayer2 = player2Name || "Player 2";
  const player1Rounds = rounds.filter((r) => r.playerNumber === 1);
  const player2Rounds = rounds.filter((r) => r.playerNumber === 2);

  const player1Total = player1Rounds.reduce((sum, r) => sum + r.score, 0);
  const player2Total = player2Rounds.reduce((sum, r) => sum + r.score, 0);

  const winner = player1Total > player2Total ? 1 : player2Total > player1Total ? 2 : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-board p-4 relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setBackOpen(true)}
        aria-label="Back to player setup"
        className="absolute top-4 left-4"
      >
        <ArrowLeft className="w-6 h-6" />
      </Button>
      <Card className="p-8 bg-card border-primary max-w-2xl w-full space-y-6">
        <Button onClick={() => setRematchOpen(true)} className="w-full font-semibold text-xl py-6">Rematch</Button>
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-bold text-foreground">
            {winner
              ? `${winner === 1 ? displayPlayer1 : displayPlayer2} Wins!`
              : "It's a Tie!"}
          </h2>
          <p className="text-xl text-muted-foreground">
            Game complete after 7 rounds
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card className="p-6 bg-primary/10 border-primary">
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">{displayPlayer1}</div>
              <div className="text-4xl sm:text-5xl font-bold font-mono text-primary break-words">
                {player1Total.toFixed(2)}
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-secondary/10 border-secondary">
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">{displayPlayer2}</div>
              <div className="text-4xl sm:text-5xl font-bold font-mono text-secondary break-words">
                {player2Total.toFixed(2)}
              </div>
            </div>
          </Card>
        </div>

      </Card>
      <Dialog open={rematchOpen} onOpenChange={setRematchOpen}>
        <DialogContent className="w-[calc(100vw-24px)]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Rematch?</DialogTitle><DialogDescription>Better luck this time!</DialogDescription></DialogHeader>
          <div className="flex gap-4"><Button variant="outline" className="flex-1" onClick={() => setRematchOpen(false)}>Cancel</Button><Button className="flex-1" onClick={() => { setRematchOpen(false); onNewGame(); }}>Rematch</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={backOpen ?? localBackOpen} onOpenChange={setBackOpen}>
        <DialogContent className="w-[calc(100vw-24px)]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Leave Game?</DialogTitle><DialogDescription>This will end the current game and take you back to player setup.</DialogDescription></DialogHeader>
          <div className="flex gap-4"><Button variant="outline" className="flex-1" onClick={() => setBackOpen(false)}>Cancel</Button><Button variant="destructive" className="flex-1" onClick={() => { setBackOpen(false); if (onBack) onBack(); else navigate("/multiplayer"); }}>Leave Game</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
