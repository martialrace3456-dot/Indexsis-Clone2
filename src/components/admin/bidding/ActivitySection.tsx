import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, X } from "lucide-react";
import { useAdBids, AdBid, bidTitle } from "@/hooks/useAdBids";
import { useReservedSlots, ReservedBidGroup } from "@/hooks/useReservedSlots";
import { BidDetailDialog } from "./BidDetailDialog";
import { BidSlot, formatMinutes } from "@/utils/bidSlots";
import { useAdvertiserNav } from "@/contexts/AdvertiserNav";
import { useAdvertiserView } from "@/contexts/AdvertiserView";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function BidRow({
  bid,
  subtitle,
  onSelect,
  onClose,
  highlighted,
}: {
  bid: AdBid;
  subtitle: string;
  onSelect: () => void;
  onClose?: () => void;
  highlighted?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(); }}
      className={cn(
        "relative p-3 text-sm flex items-center justify-between gap-3 cursor-pointer hover:bg-accent/50",
        highlighted && "animate-halo",
      )}
    >
      <div className="min-w-0">
        <div className="font-medium truncate">{bidTitle(bid)}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={bid.status === "won" ? "default" : bid.status === "ongoing" ? "secondary" : "outline"}>
          {bid.status}
        </Badge>
        {onClose && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            title="Close bid"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function BidList({
  bids,
  onSelect,
  onClose,
  highlightId,
}: {
  bids: AdBid[];
  onSelect: (b: AdBid) => void;
  onClose?: (b: AdBid) => void;
  highlightId?: string | null;
}) {
  if (bids.length === 0) return <p className="text-sm text-muted-foreground py-3">None.</p>;
  return (
    <div className="divide-y border rounded-md max-h-72 overflow-y-auto">
      {bids.map((b) => (
        <BidRow
          key={b.id}
          bid={b}
          highlighted={highlightId === b.id}
          subtitle={`${b.runtime_minutes} min @ $${Number(b.rate_per_slot).toFixed(2)}/slot · window ${new Date(b.window_start).toLocaleDateString()}–${new Date(b.window_end).toLocaleDateString()}`}
          onSelect={() => onSelect(b)}
          onClose={onClose ? () => onClose(b) : undefined}
        />
      ))}
    </div>
  );
}

function ReservedList({
  groups,
  label,
  total,
  onSelect,
  highlightId,
}: {
  groups: ReservedBidGroup[];
  label: string;
  total: number;
  onSelect: (g: ReservedBidGroup) => void;
  highlightId?: string | null;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <span className="text-sm">
          <span className="text-muted-foreground">{label}: </span>
          <span className="font-semibold">{formatMinutes(total)}</span>
        </span>
      </div>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3">None.</p>
      ) : (
        <div className="divide-y border rounded-md max-h-72 overflow-y-auto">
          {groups.map((g) => (
            <BidRow
              key={g.bid.id}
              bid={g.bid}
              highlighted={highlightId === g.bid.id}
              subtitle={`${g.slots.length} slot${g.slots.length > 1 ? "s" : ""} · ${formatMinutes(g.minutes)}`}
              onSelect={() => onSelect(g)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ActivitySection() {
  const { bids, updateBid, closeBid } = useAdBids();
  const { byCategory, totals } = useReservedSlots();
  const nav = useAdvertiserNav();
  const view = useAdvertiserView();
  const viewOnly = !!view?.viewOnly;
  const [selected, setSelected] = useState<AdBid | null>(null);
  const [reservedSelected, setReservedSelected] = useState<ReservedBidGroup | null>(null);

  const sorted = useMemo(
    () => [...bids].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [bids],
  );
  const ongoing = sorted.filter((b) => b.status === "ongoing");
  const expired = sorted.filter((b) => b.status !== "ongoing");

  const resolveNow = async () => {
    const now = Date.now();
    await Promise.all(
      ongoing
        .filter((b) => new Date(b.window_end).getTime() <= now)
        .map((b) => updateBid(b.id, { status: "expired", resolved_at: new Date().toISOString() })),
    );
  };

  const handleClose = async (b: AdBid) => {
    const ok = await closeBid(b.id);
    if (ok) toast.success("Bid closed");
    else toast.error("Failed to close bid");
  };

  const reservedSlots: BidSlot[] = reservedSelected?.slots ?? [];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold flex items-center gap-2"><History className="h-4 w-4" /> Activity</h3>
      <Tabs value={nav?.bidTab === "reserved" ? "reserved" : "bidding"} onValueChange={(v) => nav?.setBidTab(v === "reserved" ? "reserved" : "ongoing")}>
        <TabsList>
          <TabsTrigger value="bidding">Bidding</TabsTrigger>
          <TabsTrigger value="reserved">Reserved</TabsTrigger>
        </TabsList>
        <TabsContent value="bidding" className="space-y-3">
          {!viewOnly && <div className="flex justify-end"><Button variant="outline" size="sm" onClick={resolveNow}>Resolve expired</Button></div>}
          <Tabs defaultValue="ongoing">
            <TabsList>
              <TabsTrigger value="ongoing">Ongoing Bids</TabsTrigger>
              <TabsTrigger value="expired">Expired Bids</TabsTrigger>
            </TabsList>
            <TabsContent value="ongoing">
              <BidList bids={ongoing} onSelect={setSelected} onClose={viewOnly ? undefined : handleClose} highlightId={nav?.highlightId} />
            </TabsContent>
            <TabsContent value="expired">
              <BidList bids={expired} onSelect={setSelected} highlightId={nav?.highlightId} />
            </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="reserved">
          <Tabs defaultValue="functional">
            <TabsList>
              <TabsTrigger value="functional">Functional</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
              <TabsTrigger value="harnessed">Harnessed</TabsTrigger>
            </TabsList>
            <TabsContent value="functional">
              <ReservedList
                groups={byCategory.functional}
                label="Total Amount of Reserved Time"
                total={totals.functional}
                onSelect={setReservedSelected}
                highlightId={nav?.highlightId}
              />
            </TabsContent>
            <TabsContent value="expired">
              <ReservedList
                groups={byCategory.expired}
                label="Total Amount of Expired Time"
                total={totals.expired}
                onSelect={setReservedSelected}
                highlightId={nav?.highlightId}
              />
            </TabsContent>
            <TabsContent value="harnessed">
              <ReservedList
                groups={byCategory.harnessed}
                label="Total Amount of Harnessed Time"
                total={totals.harnessed}
                onSelect={setReservedSelected}
                highlightId={nav?.highlightId}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      <BidDetailDialog
        bid={selected}
        open={!!selected}
        onOpenChange={(o) => { if (!o) setSelected(null); }}
        readOnly={viewOnly}
      />

      <BidDetailDialog
        bid={reservedSelected?.bid ?? null}
        open={!!reservedSelected}
        onOpenChange={(o) => { if (!o) setReservedSelected(null); }}
        variant="reserved"
        reservedSlots={reservedSlots}
        readOnly={viewOnly}
      />
    </div>
  );
}
