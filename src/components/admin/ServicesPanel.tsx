import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Report {
  id: string;
  campaign_id: string | null;
  campaign_title: string;
  media_url: string | null;
  content_type: string | null;
  link_url: string | null;
  description: string;
  status: string;
  created_at: string;
}

export function ServicesPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("ad_reports").select("*").order("created_at", { ascending: false });
    setReports((data ?? []) as Report[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`ad_reports_admin-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_reports" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    await supabase.from("ad_reports").update({ status }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Services</h2>
        <p className="text-sm text-muted-foreground">Reports submitted by players about ads and links on the game board.</p>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : reports.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No reports yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex gap-4">
                <div className="w-24 h-24 shrink-0 rounded bg-muted overflow-hidden">
                  {r.media_url && (r.content_type === "video" ? (
                    <video src={r.media_url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={r.media_url} alt={r.campaign_title || "ad"} className="w-full h-full object-cover" />
                  ))}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{r.campaign_title || "Untitled ad"}</span>
                    <Badge variant={r.status === "resolved" ? "secondary" : "destructive"}>{r.status === "resolved" ? "Resolved" : "Pending"}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">{format(new Date(r.created_at), "PPp")}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{r.description}</p>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4">
                    <span>Type: {r.content_type ?? "—"}</span>
                    <span>Campaign: {r.campaign_id?.slice(0, 8) ?? "—"}</span>
                    {r.link_url ? (
                      <a href={r.link_url} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1 truncate max-w-full">
                        Link: {r.link_url} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : <span>Link: none</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {r.status === "resolved" ? (
                    <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "pending")}>Reopen</Button>
                  ) : (
                    <Button size="sm" onClick={() => setStatus(r.id, "resolved")}>Resolve</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
