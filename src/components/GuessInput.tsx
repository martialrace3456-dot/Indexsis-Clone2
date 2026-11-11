import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface GuessInputProps {
  onSubmit: (guess: number) => void;
  disabled?: boolean;
}

export const GuessInput = ({ onSubmit, disabled = false }: GuessInputProps) => {
  const [guess, setGuess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const guessValue = parseFloat(guess);
    
    if (isNaN(guessValue) || guessValue < 0) {
      setError("Please enter a valid positive number");
      return;
    }

    setError("");
    onSubmit(guessValue);
  };

  return (
    <Card className="p-6 bg-card border-primary space-y-4">
      <div>
        <h3 className="text-xl font-bold text-foreground mb-2">
          Enter Your Guess
        </h3>
        <p className="text-sm text-muted-foreground">
          Based on your samples, estimate the actual board density (ρₐ)
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Estimated Density (ρₐ)
        </label>
        <Input
          type="number"
          step="0.000001"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="0.000000"
          disabled={disabled}
          className="font-mono text-lg bg-input border-border focus:border-primary"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={disabled}
        className="w-full bg-gradient-accent hover:opacity-90 text-primary-foreground font-semibold text-lg py-6"
      >
        Submit Guess
      </Button>
    </Card>
  );
};
