import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  email: string;
  createdAt: string;
  country?: string | null;
  ageGroup?: string | null;
}

export function ProfileDialog({ open, onOpenChange, username, email, createdAt, country, ageGroup }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Username" value={username} />
          <Field label="Email" value={email || "—"} />
          <Field label="Country" value={country || "—"} />
          <Field label="Age" value={ageGroup || "—"} />
          <Field label="Member since" value={createdAt ? new Date(createdAt).toLocaleDateString() : "—"} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
