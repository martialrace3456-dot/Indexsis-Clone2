import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getAdvertiserLinkStatus, requestAdvertiserLink } from "@/utils/advertiserLinking";

export function AdvertiserLinkGate() {
  const [status, setStatus] = useState<{ linked: boolean; userId: string | null; playerId: string | null; username: string | null; isAdmin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const next = await getAdvertiserLinkStatus();
      if (active) setStatus(next);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    const result = await requestAdvertiserLink({ username: username.trim() || undefined });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    const next = await getAdvertiserLinkStatus();
    setStatus(next);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (status?.linked) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Verify advertiser access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your secure Auth account is active, but it is not linked to a verified legacy advertiser record. Use this form to request manual admin review. No legacy advertiser data will be exposed until an administrator confirms the correct player mapping.
          </p>

          <div className="space-y-2">
            <Label>Legacy advertiser username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter the legacy advertiser name you want linked"
            />
          </div>

          <Button className="w-full" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Submitting request..." : "Request account verification"}
          </Button>

          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            Signed in as: {status?.userId ? status.userId : "not available"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
