import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAdvertiserHistory } from "@/hooks/useAdvertiserHistory";
import { HistoryEntry } from "@/utils/advertiserHistory";
import { HistoryCard } from "./HistoryCard";
import { useAdvertiserNav } from "@/contexts/AdvertiserNav";
import { useAdvertiserView } from "@/contexts/AdvertiserView";
import { toast } from "sonner";

export function HistoryPanel() {
  const { entries, loading, deleteEntry } = useAdvertiserHistory();
  const nav = useAdvertiserNav();
  const view = useAdvertiserView();
  const viewOnly = !!view?.viewOnly;
  const [fundEntry, setFundEntry] = useState<HistoryEntry | null>(null);

  const actionable = (e: HistoryEntry) =>
    e.action !== "ad_deleted" && e.action !== "advertisement_deleted" && e.action !== "link_deleted";

  const seeAction = (e: HistoryEntry) => {
    switch (e.action) {
      case "ad_created":
        nav?.setTab("home");
        break;
      case "link_created":
        nav?.setTab("home");
        nav?.setHomeSub("links");
        break;
      case "advertisement_updated":
      case "advertisement_placed":
        nav?.setTab("home");
        nav?.setCampaignTab("running");
        break;
      case "advertisement_stopped":
        nav?.setTab("home");
        nav?.setCampaignTab("expired");
        break;
      case "fund_loaded":
      case "fund_approved":
        setFundEntry(e);
        return;
      case "bid_placed":
        nav?.setTab("finance");
        nav?.setBidTab("ongoing");
        break;
      case "bid_stopped":
        nav?.setTab("finance");
        nav?.setBidTab("expired");
        break;
      default:
        return;
    }
    if (e.target_id) nav?.highlight(e.target_id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const meta = (fundEntry?.metadata ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">History</h3>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No activity recorded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <HistoryCard
              key={e.id}
              entry={e}
              actionable={actionable(e)}
              onSeeAction={() => seeAction(e)}
              onDelete={
                viewOnly
                  ? undefined
                  : async () => {
                      const ok = await deleteEntry(e.id);
                      if (!ok) toast.error("Failed to delete record");
                    }
              }
            />
          ))}
        </div>
      )}

      <Dialog open={!!fundEntry} onOpenChange={(o) => { if (!o) setFundEntry(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{fundEntry?.action === "fund_approved" ? "Fund Approved" : "Fund Loaded"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <Row label="Amount" value={meta.amount != null ? `$${Number(meta.amount).toFixed(2)}` : "—"} />
            <Row label="Sender Address" value={(meta.from_address as string) || "—"} />
            <Row label="Receiver Address" value={(meta.to_address as string) || "—"} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium break-all">{value}</div>
    </div>
  );
}
