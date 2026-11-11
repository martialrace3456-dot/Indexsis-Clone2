import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { hashPasscode } from "@/utils/hashPasscode";
import { toast } from "sonner";
import { useAdminSettings } from "@/hooks/useAdminSettings";

interface CreateContestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContestCreated: () => void;
}

const DURATION_OPTIONS = [
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
  { value: "240", label: "4 hours" },
  { value: "480", label: "8 hours" },
  { value: "720", label: "12 hours" },
  { value: "1440", label: "24 hours" },
  { value: "2880", label: "48 hours" },
  { value: "10080", label: "1 week" },
];

export function CreateContestModal({
  open,
  onOpenChange,
  onContestCreated,
}: CreateContestModalProps) {
  const { settings } = useAdminSettings();
  const [contestName, setContestName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [participantLimit, setParticipantLimit] = useState("100");
  const [passcode, setPasscode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contestName.trim() || !passcode.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (passcode.length < 4) {
      toast.error("Passcode must be at least 4 characters");
      return;
    }

    if (settings.require_contest_approval && !description.trim()) {
      toast.error("Please write a message to the admin");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: existing, error: dupError } = await supabase
        .from('contests')
        .select('id')
        .ilike('name', contestName.trim().replace(/[\\%_]/g, (m) => `\\${m}`))
        .limit(1);
      if (dupError) throw dupError;
      if (existing && existing.length > 0) {
        toast.error("A contest with this name already exists. Please choose another name.");
        return;
      }

      const hashedPasscode = await hashPasscode(passcode);
      const durationMinutes = parseInt(duration);
      const endsAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

      // Determine approval status based on admin settings
      const approvalStatus = settings.require_contest_approval ? 'pending' : 'approved';

      const { error } = await supabase.from('contests').insert({
        name: contestName.trim(),
        description: description.trim() || null,
        passcode_hash: hashedPasscode,
        duration_minutes: durationMinutes,
        participant_limit: parseInt(participantLimit),
        ends_at: endsAt,
        approval_status: approvalStatus,
      });

      if (error) throw error;

      if (approvalStatus === 'pending') {
        toast.success("Contest submitted for approval. It will appear once approved.");
      } else {
        toast.success("Contest created successfully!");
      }
      
      onContestCreated();
      onOpenChange(false);
      
      // Reset form
      setContestName("");
      setDescription("");
      setDuration("60");
      setParticipantLimit("100");
      setPasscode("");
    } catch (error) {
      console.error('Error creating contest:', error);
      toast.error("Failed to create contest");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="bg-card border-border sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Launch a Contest</DialogTitle>
          <DialogDescription>
            Create a private contest with its own stats. Scores will also count toward global rankings.
            {settings.require_contest_approval && (
              <span className="block mt-1 text-amber-500">
                Note: Contests require admin approval before going live.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contestName">Contest Name</Label>
            <Input
              id="contestName"
              value={contestName}
              onChange={(e) => setContestName(e.target.value)}
              placeholder="My Awesome Contest"
              maxLength={50}
              className="bg-input border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Message to Admin {settings.require_contest_approval ? "*" : "(Optional)"}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required={settings.require_contest_approval}
              placeholder="Write a message to the admin..."
              maxLength={500}
              rows={3}
              className="bg-input border-border resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="participantLimit">Participant Limit</Label>
            <Input
              id="participantLimit"
              type="number"
              value={participantLimit}
              onChange={(e) => setParticipantLimit(e.target.value)}
              min={2}
              max={1000}
              className="bg-input border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passcode">Conductor Passcode</Label>
            <Input
              id="passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Min 4 characters"
              minLength={4}
              className="bg-input border-border"
            />
            <p className="text-xs text-muted-foreground">
              You'll need this to manage your contest
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !contestName.trim() || !passcode.trim() || (settings.require_contest_approval && !description.trim())}
              className="flex-1 bg-gradient-accent hover:opacity-90"
            >
              {isSubmitting ? "Creating..." : "Start Contest"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
