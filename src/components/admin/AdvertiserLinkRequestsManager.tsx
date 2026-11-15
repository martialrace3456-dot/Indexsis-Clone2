import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { reviewAdvertiserLinkRequest } from "@/utils/advertiserLinking";
import { toast } from "sonner";
import { Check, RefreshCw, X } from "lucide-react";

interface LinkRequestRow {
  id: string;
  user_id: string;
  requested_username: string;
  note: string;
  status: string;
  created_at: string;
}

export function AdvertiserLinkRequestsManager() {
  const [rows, setRows] = useState<LinkRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("advertiser_link_requests" as never)
      .select("id, user_id, requested_username, note, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Unable to load advertiser link requests", error);
      toast.error("Unable to load verification requests. Confirm the migration is applied and your admin role is provisioned.");
      setRows([]);
    } else {
      setRows((data ?? []) as unknown as LinkRequestRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchRequests(); }, [fetchRequests]);

  const review = async (id: string, decision: "approve" | "reject") => {
    setBusyId(id);
    const result = await reviewAdvertiserLinkRequest(id, decision);
    setBusyId(null);
    if (!result.ok) toast.error(result.message);
    else {
      toast.success(result.message);
      await fetchRequests();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advertiser Link Requests</h2>
          <p className="text-sm text-muted-foreground">Review account ownership requests. Approval links only an exact, unique legacy username match.</p>
        </div>
        <Button variant="outline" onClick={() => void fetchRequests()} disabled={loading}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>
      {loading ? <p className="text-muted-foreground">Loading requests…</p> : rows.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No pending verification requests.</CardContent></Card>
      ) : rows.map((row) => (
        <Card key={row.id}>
          <CardHeader><CardTitle className="text-base">{row.requested_username}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground break-all">Auth user: {row.user_id}</div>
            <div className="text-xs text-muted-foreground">Submitted: {new Date(row.created_at).toLocaleString()}</div>
            {row.note && <Textarea readOnly value={row.note} className="min-h-20" aria-label="Applicant verification details" />}
            <div className="flex gap-2">
              <Button onClick={() => void review(row.id, "approve")} disabled={busyId === row.id}><Check className="h-4 w-4 mr-2" />Approve link</Button>
              <Button variant="destructive" onClick={() => void review(row.id, "reject")} disabled={busyId === row.id}><X className="h-4 w-4 mr-2" />Reject</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
