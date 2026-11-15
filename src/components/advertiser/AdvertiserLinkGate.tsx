import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getAdvertiserLinkStatus, requestAdvertiserLink } from "@/utils/advertiserLinking";

export function AdvertiserLinkGate() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getAdvertiserLinkStatus>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    setStatus(await getAdvertiserLinkStatus());
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    void getAdvertiserLinkStatus().then((next) => {
      if (active) {
        setStatus(next);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    const result = await requestAdvertiserLink({ username, note });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    await refresh();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (status?.linked) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader><CardTitle>Verify advertiser access</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your signed-in account is not linked to a verified legacy advertiser record. Submit a request for admin review. Protected data remains unavailable until approval.
          </p>
          {status?.requestStatus === "pending" ? (
            <div className="rounded-md border bg-muted/40 p-4 text-sm">Your request is pending administrator review.</div>
          ) : (
            <>
              {status?.requestStatus === "rejected" && <p className="text-sm text-destructive">Your previous request was rejected. You may submit a new request with corrected information.</p>}
              <div className="space-y-2">
                <Label htmlFor="legacy-username">Legacy advertiser username</Label>
                <Input id="legacy-username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={80} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-note">Additional verification details (optional)</Label>
                <Textarea id="link-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
              </div>
              <Button className="w-full" disabled={submitting} onClick={() => void handleSubmit()}>
                {submitting ? "Submitting..." : "Submit verification request"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
