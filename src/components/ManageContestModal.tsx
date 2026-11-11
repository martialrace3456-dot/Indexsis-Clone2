import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { verifyPasscode } from "@/utils/hashPasscode";
import { ContestWithParticipants } from "@/types/contest";
import { toast } from "sonner";
import { Clock, Users, Trash2, StopCircle } from "lucide-react";

interface ManageContestModalProps {
  contest: ContestWithParticipants | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContestUpdated: () => void;
}

export function ManageContestModal({
  contest,
  open,
  onOpenChange,
  onContestUpdated,
}: ManageContestModalProps) {
  const [passcode, setPasscode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [extendHours, setExtendHours] = useState("1");
  const [newLimit, setNewLimit] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVerify = async () => {
    if (!contest || !passcode) return;
    
    setIsVerifying(true);
    try {
      const isValid = await verifyPasscode(passcode, contest.passcode_hash);
      if (isValid) {
        setIsVerified(true);
        setNewLimit(contest.participant_limit.toString());
      } else {
        toast.error("Invalid passcode");
      }
    } catch (error) {
      toast.error("Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExtendTime = async () => {
    if (!contest) return;
    setIsSubmitting(true);
    
    try {
      const currentEnd = new Date(contest.ends_at);
      const newEnd = new Date(currentEnd.getTime() + parseInt(extendHours) * 60 * 60 * 1000);
      
      const { error } = await supabase
        .from('contests')
        .update({ ends_at: newEnd.toISOString() })
        .eq('id', contest.id);

      if (error) throw error;
      toast.success(`Extended by ${extendHours} hour(s)`);
      onContestUpdated();
    } catch (error) {
      toast.error("Failed to extend time");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLimit = async () => {
    if (!contest) return;
    const limit = parseInt(newLimit);
    
    if (limit < contest.participant_count) {
      toast.error(`Cannot set limit below current participants (${contest.participant_count})`);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('contests')
        .update({ participant_limit: limit })
        .eq('id', contest.id);

      if (error) throw error;
      toast.success("Participant limit updated");
      onContestUpdated();
    } catch (error) {
      toast.error("Failed to update limit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndContest = async () => {
    if (!contest) return;
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('contests')
        .update({ status: 'expired', ends_at: new Date().toISOString() })
        .eq('id', contest.id);

      if (error) throw error;
      toast.success("Contest ended");
      handleClose();
      onContestUpdated();
    } catch (error) {
      toast.error("Failed to end contest");
    } finally {
      setIsSubmitting(false);
      setShowEndConfirm(false);
    }
  };

  const handleDeleteContest = async () => {
    if (!contest) return;
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', contest.id);

      if (error) throw error;
      toast.success("Contest deleted");
      handleClose();
      onContestUpdated();
    } catch (error) {
      toast.error("Failed to delete contest");
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleClose = () => {
    setPasscode("");
    setIsVerified(false);
    setExtendHours("1");
    onOpenChange(false);
  };

  if (!contest) return null;

  const isExpired = contest.status === 'expired';

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent 
          className="bg-card border-border sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {isVerified ? `Manage: ${contest.name}` : "Enter Passcode"}
            </DialogTitle>
            <DialogDescription>
              {isVerified 
                ? "Adjust settings or end your contest"
                : "Enter the conductor passcode to manage this contest"
              }
            </DialogDescription>
          </DialogHeader>

          {!isVerified ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verifyPasscode">Passcode</Label>
                <Input
                  id="verifyPasscode"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter conductor passcode"
                  className="bg-input border-border"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleVerify} 
                  disabled={!passcode || isVerifying}
                  className="flex-1 bg-gradient-accent hover:opacity-90"
                >
                  {isVerifying ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Contest Info */}
              <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {contest.participant_count}/{contest.participant_limit} participants
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {isExpired ? "Ended" : `Ends ${new Date(contest.ends_at).toLocaleString()}`}
                  </span>
                </div>
              </div>

              {/* Extend Time (only for active contests) */}
              {!isExpired && (
                <div className="space-y-2">
                  <Label>Extend Duration</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={extendHours}
                      onChange={(e) => setExtendHours(e.target.value)}
                      min={1}
                      max={168}
                      className="bg-input border-border w-24"
                    />
                    <span className="flex items-center text-sm text-muted-foreground">hours</span>
                    <Button 
                      onClick={handleExtendTime} 
                      disabled={isSubmitting}
                      variant="outline"
                      className="ml-auto"
                    >
                      Extend
                    </Button>
                  </div>
                </div>
              )}

              {/* Update Limit (only for active contests) */}
              {!isExpired && (
                <div className="space-y-2">
                  <Label>Participant Limit</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={newLimit}
                      onChange={(e) => setNewLimit(e.target.value)}
                      min={contest.participant_count}
                      max={1000}
                      className="bg-input border-border w-24"
                    />
                    <span className="flex items-center text-xs text-muted-foreground">
                      (min: {contest.participant_count})
                    </span>
                    <Button 
                      onClick={handleUpdateLimit} 
                      disabled={isSubmitting}
                      variant="outline"
                      className="ml-auto"
                    >
                      Update
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-border">
                {!isExpired && (
                  <Button
                    variant="outline"
                    onClick={() => setShowEndConfirm(true)}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    <StopCircle className="w-4 h-4 mr-2" />
                    End Contest
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Contest
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* End Contest Confirmation */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>End Contest?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end the contest immediately. No more participants can join, but the stats will remain visible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndContest}>End Contest</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Contest Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contest?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the contest and all its scores. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContest} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
