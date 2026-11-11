import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { Announcement, ANNOUNCEMENT_TARGETS, AnnouncementTarget } from "@/types/admin";
import { Plus, Trash2, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const TYPE_CONFIG = {
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/20" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/20" },
  success: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/20" },
  error: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/20" },
};

export function AnnouncementManager() {
  const { announcements, loading, createAnnouncement, updateAnnouncement, deleteAnnouncement } =
    useAnnouncements();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newAnnouncement, setNewAnnouncement] = useState({
    message: "",
    type: "info" as Announcement['type'],
    is_active: true,
    expires_at: "",
    targets: ['all'] as string[],
  });

  const handleCreate = async () => {
    if (!newAnnouncement.message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (newAnnouncement.targets.length === 0) {
      toast.error("Please select at least one target screen");
      return;
    }

    const success = await createAnnouncement({
      ...newAnnouncement,
      expires_at: newAnnouncement.expires_at || null,
      targets: newAnnouncement.targets,
    });

    if (success) {
      toast.success("Announcement created");
      setShowAddDialog(false);
      setNewAnnouncement({ message: "", type: "info", is_active: true, expires_at: "", targets: ['all'] });
    } else {
      toast.error("Failed to create announcement");
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const success = await updateAnnouncement(id, { is_active: !currentActive });
    if (success) {
      toast.success(currentActive ? "Announcement deactivated" : "Announcement activated");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const success = await deleteAnnouncement(deletingId);
    if (success) {
      toast.success("Announcement deleted");
    } else {
      toast.error("Failed to delete announcement");
    }
    setDeletingId(null);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const handleTargetToggle = (target: AnnouncementTarget) => {
    setNewAnnouncement((prev) => {
      const currentTargets = prev.targets;
      
      // If selecting 'all', clear other selections
      if (target === 'all') {
        return { ...prev, targets: ['all'] };
      }
      
      // If selecting a specific target, remove 'all' if present
      let newTargets = currentTargets.filter(t => t !== 'all');
      
      if (newTargets.includes(target)) {
        newTargets = newTargets.filter(t => t !== target);
      } else {
        newTargets.push(target);
      }
      
      // If no targets selected, default to 'all'
      if (newTargets.length === 0) {
        newTargets = ['all'];
      }
      
      return { ...prev, targets: newTargets };
    });
  };

  const getTargetLabels = (targets: string[]) => {
    if (!targets || targets.length === 0 || targets.includes('all')) {
      return 'All Screens';
    }
    return targets.map(t => {
      const found = ANNOUNCEMENT_TARGETS.find(at => at.value === t);
      return found?.label || t;
    }).join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Announcements</h2>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No announcements yet. Create one to broadcast messages to all players.
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => {
            const typeConfig = TYPE_CONFIG[announcement.type];
            const TypeIcon = typeConfig.icon;
            const expired = isExpired(announcement.expires_at);

            return (
              <Card
                key={announcement.id}
                className={`${announcement.is_active && !expired ? "border-primary" : ""} ${
                  expired ? "opacity-60" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${typeConfig.bg}`}>
                        <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{announcement.message}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant="outline" className="capitalize">
                            {announcement.type}
                          </Badge>
                          <Badge variant={announcement.is_active && !expired ? "default" : "secondary"}>
                            {expired ? "Expired" : announcement.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Targets: {getTargetLabels(announcement.targets)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Created: {format(new Date(announcement.created_at), "MMM d, yyyy HH:mm")}
                          {announcement.expires_at && (
                            <> · Expires: {format(new Date(announcement.expires_at), "MMM d, yyyy HH:mm")}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={announcement.is_active}
                        onCheckedChange={() =>
                          handleToggleActive(announcement.id, announcement.is_active)
                        }
                        disabled={expired}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingId(announcement.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Announcement Dialog */}
      <AlertDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>New Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Create an announcement to display to players on selected screens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={newAnnouncement.message}
                onChange={(e) =>
                  setNewAnnouncement({ ...newAnnouncement, message: e.target.value })
                }
                placeholder="Enter your announcement message..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newAnnouncement.type}
                onValueChange={(value: Announcement['type']) =>
                  setNewAnnouncement({ ...newAnnouncement, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Screens</Label>
              <div className="space-y-2 border rounded-md p-3">
                {ANNOUNCEMENT_TARGETS.map((target) => (
                  <div key={target.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`target-${target.value}`}
                      checked={newAnnouncement.targets.includes(target.value)}
                      onCheckedChange={() => handleTargetToggle(target.value)}
                    />
                    <label
                      htmlFor={`target-${target.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {target.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expires At (optional)</Label>
              <input
                type="datetime-local"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={newAnnouncement.expires_at}
                onChange={(e) =>
                  setNewAnnouncement({ ...newAnnouncement, expires_at: e.target.value })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={newAnnouncement.is_active}
                onCheckedChange={(checked) =>
                  setNewAnnouncement({ ...newAnnouncement, is_active: checked })
                }
              />
              <Label htmlFor="active">Active immediately</Label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreate}>Create</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The announcement will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
