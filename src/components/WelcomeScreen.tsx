import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, ArrowLeft } from "lucide-react";

interface WelcomeScreenProps {
  onStart: (player1Name: string, player2Name: string) => void;
}

export const WelcomeScreen = ({ onStart }: WelcomeScreenProps) => {
  const navigate = useNavigate();
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (player1Name.trim() && player2Name.trim()) {
      onStart(player1Name.trim(), player2Name.trim());
    }
  };

  const isValid = player1Name.trim().length > 0 && player2Name.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-board flex items-center justify-center p-4 relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate("/")}
        className="absolute top-4 left-4"
      >
        <ArrowLeft className="w-6 h-6" />
      </Button>
      <Card className="max-w-2xl w-full p-8 bg-card border-2 border-primary shadow-lg shadow-primary/20 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-accent flex items-center justify-center shadow-glow">
              <Users className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-5xl font-bold text-foreground mb-2">
              Indexsis
            </h1>
            <p className="text-lg text-muted-foreground">
              Statistical Inference & Blind Sampling Game
            </p>
          </div>
        </div>

        {/* Player Names Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="player1" className="text-foreground text-base">
                Player 1 Name
              </Label>
              <Input
                id="player1"
                type="text"
                placeholder="Enter name"
                value={player1Name}
                onChange={(e) => setPlayer1Name(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="player2" className="text-foreground text-base">
                Player 2 Name
              </Label>
              <Input
                id="player2"
                type="text"
                placeholder="Enter name"
                value={player2Name}
                onChange={(e) => setPlayer2Name(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                maxLength={20}
              />
            </div>
          </div>

          {/* Game Rules */}
          <Card className="p-6 bg-muted/30 border-border space-y-4">
            <h2 className="text-xl font-bold text-foreground">Game Rules</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Take 5 blind samples from the dot board by touching different areas</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Use the sample densities to estimate the overall dot density</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Score is based on statistical accuracy - closer guesses earn more points</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Each player completes 7 rounds - highest total score wins!</span>
              </li>
            </ul>
          </Card>

          {/* Start Button */}
          <Button
            type="submit"
            disabled={!isValid}
            className="w-full bg-gradient-accent hover:opacity-90 text-primary-foreground font-semibold text-xl py-8 shadow-glow"
          >
            Start Game
          </Button>
        </form>
      </Card>
    </div>
  );
};
