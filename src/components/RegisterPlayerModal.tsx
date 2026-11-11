import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerPlayer } from "@/utils/playerAuth";
import { toast } from "sonner";

interface RegisterPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered: (username: string) => void;
}

export function RegisterPlayerModal({ open, onOpenChange, onRegistered }: RegisterPlayerModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error("Please fill in both fields");
      return;
    }
    if (!country.trim()) {
      toast.error("Please enter your country");
      return;
    }
    if (username.trim().length > 20) {
      toast.error("Username must be 20 characters or less");
      return;
    }
    if (password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }

    setLoading(true);
    const player = await registerPlayer(username.trim(), password, country.trim());
    setLoading(false);

    if (player) {
      toast.success("Account created successfully!");
      onRegistered(player.username);
      setUsername("");
      setPassword("");
      setCountry("");
      onOpenChange(false);
    } else {
      toast.error("Username already taken or registration failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create an Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              maxLength={20}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Country <span className="text-muted-foreground">*</span></label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. United States"
              maxLength={50}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Creating..." : "Done"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
