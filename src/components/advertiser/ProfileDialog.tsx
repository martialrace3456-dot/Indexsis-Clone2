import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  playerId: string;
}

interface ProfileRow {
  username: string;
  email: string | null;
  country: string | null;
  age_group: string | null;
  created_at: string;
}

export function ProfileDialog({ open, onOpenChange, playerId }: Props) {
  const [row, setRow] = useState<ProfileRow | null>(null);

  useEffect(() => {
    if (!open || !playerId) return;
    (async () => {
      const { data } = await supabase
        .from("players")
        .select("username, email, country, age_group, created_at")
        .eq("id", playerId)
        .maybeSingle();
      setRow((data as ProfileRow) ?? null);
    })();
  }, [open, playerId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>
        {!row ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-3">
            <Field label="Username" value={row.username} />
            <Field label="Email" value={row.email || "—"} />
            <Field label="Country" value={row.country || "—"} />
            <Field label="Age" value={row.age_group || "—"} />
            <Field label="Member since" value={new Date(row.created_at).toLocaleDateString()} />
          </div>
        )}
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