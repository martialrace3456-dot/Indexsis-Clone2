import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { AdBid, bidTitle } from "@/hooks/useAdBids";
import { useBidSlots } from "@/hooks/useBidSlots";
import { BidSlot, SlotGroup, formatMinutes, formatRange, groupSlots } from "@/utils/bidSlots";
import { cn } from "@/lib/utils";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function AddAmountDialog({
  open,
  onOpenChange,
  currentRate,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentRate: number;
  onAdd: (amount: number) => void;
}) {
  const [amount, setAmount] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Increase bid</DialogTitle>
        </DialogHeader>
        <Row label="Current winning rate" value={`$${currentRate.toFixed(2)}`} />
        <div className="space-y-1">
          <Label>Amount to add per slot</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            const v = parseFloat(amount || "0");
            if (v > 0) onAdd(v);
            setAmount("");
            onOpenChange(false);
          }}
        >
          Add
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function BulkAddDialog({
  open,
  onOpenChange,
  groups,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  groups: SlotGroup[];
  onAdd: (slotIds: string[], amount: number) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const toggle = (ids: string[]) =>
    setSelected((prev) =>
      ids.every((i) => prev.includes(i))
        ? prev.filter((i) => !ids.includes(i))
        : Array.from(new Set([...prev, ...ids])),
    );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Increase the Bid for All</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto space-y-1 border rounded-md p-2">
          {groups.map((g) => {
            const checked = g.slotIds.every((i) => selected.includes(i));
            return (
              <button
                key={g.slotIds[0]}
                type="button"
                onClick={() => toggle(g.slotIds)}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-accent"
              >
                <Checkbox checked={checked} />
                <span>
                  {g.count} slot{g.count > 1 ? "s" : ""} ({formatRange(g.start, g.end)}) — $
                  {g.rate.toFixed(2)}
                </span>
              </button>
            );
          })}
          {groups.length === 0 && <p className="text-sm text-muted-foreground">No slots.</p>}
        </div>
        <div className="space-y-1">
          <Label>Amount to add per slot</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            const v = parseFloat(amount || "0");
            if (v > 0 && selected.length) onAdd(selected, v);
            setSelected([]);
            setAmount("");
            onOpenChange(false);
          }}
        >
          Add
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function ActiveZone({
  title,
  slots,
  tone,
  currentWinningRate,
  onRaise,
  readOnly,
}: {
  title: string;
  slots: BidSlot[];
  tone: "win" | "lose";
  currentWinningRate: (slotStart: string) => number;
  onRaise: (slotIds: string[], amount: number) => void;
  readOnly?: boolean;
}) {
  const groups = useMemo(() => groupSlots(slots), [slots]);
  const [openGroup, setOpenGroup] = useState<SlotGroup | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const color = tone === "win" ? "text-green-500" : "text-red-500";

  return (
    <div className="space-y-2">
      <p className={cn("text-sm font-semibold", color)}>{title}</p>
      <ul className={cn("space-y-1 text-sm", color)}>
        {groups.map((g) => (
          <li key={g.slotIds[0]} className="flex items-center gap-2">
            <span>
              • {g.count} slot{g.count > 1 ? "s" : ""} ({formatRange(g.start, g.end)}) —
            </span>
            {readOnly ? (
              <span>${g.rate.toFixed(2)}</span>
            ) : (
              <button
                type="button"
                onClick={() => setOpenGroup(g)}
                className="inline-flex items-center gap-1 hover:underline"
                title="Increase bid"
              >
                <Plus className="h-3 w-3" />${g.rate.toFixed(2)}
              </button>
            )}
          </li>
        ))}
        {groups.length === 0 && <li className="text-muted-foreground">None.</li>}
      </ul>
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
          Increase the Bid for All (+)
        </Button>
      )}

      {openGroup && !readOnly && (
        <AddAmountDialog
          open={!!openGroup}
          onOpenChange={(o) => !o && setOpenGroup(null)}
          currentRate={currentWinningRate(
            slots.find((s) => s.id === openGroup.slotIds[0])?.slot_start ?? "",
          )}
          onAdd={(amt) => onRaise(openGroup.slotIds, amt)}
        />
      )}
      {!readOnly && (
        <BulkAddDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          groups={groups}
          onAdd={onRaise}
        />
      )}
    </div>
  );
}

export function BidDetailDialog({
  bid,
  open,
  onOpenChange,
  variant = "bidding",
  reservedSlots,
  readOnly,
}: {
  bid: AdBid | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** "reserved" hides the active-slot panel and shows reserved totals instead. */
  variant?: "bidding" | "reserved";
  reservedSlots?: BidSlot[];
  /** hides the bid-increase controls (admin read-only view) */
  readOnly?: boolean;
}) {
  const reserved = variant === "reserved";
  const {
    acquired,
    winning,
    losing,
    acquiredMinutes,
    unacquiredMinutes,
    availableMinutes,
    totalCost,
    raiseRate,
    currentWinningRate,
  } = useBidSlots(open && !reserved ? bid : null);

  const shownSlots = reserved ? reservedSlots ?? [] : acquired;
  const shownGroups = useMemo(() => groupSlots(shownSlots), [shownSlots]);
  const shownCost = reserved
    ? shownSlots.reduce((s, x) => s + Number(x.rate), 0)
    : totalCost;
  const shownMinutes = reserved ? shownSlots.length * 10 : acquiredMinutes;

  if (!bid) return null;

  const period = formatRange(
    new Date(bid.window_start).getTime(),
    new Date(bid.window_end).getTime(),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bid: {bidTitle(bid)}</DialogTitle>
        </DialogHeader>

        <Row label="Selected Auctions Window" value={period} />
        <Row label="Required Amount of Runtime" value={formatMinutes(bid.runtime_minutes)} />

        <div className={cn("grid grid-cols-1 gap-4 pt-2", !reserved && "md:grid-cols-2")}>
          <div className="border rounded-md p-3 space-y-2">
            <p className="font-semibold text-sm">Acquired slots</p>
            <ul className="space-y-1 text-sm">
              {shownGroups.map((g) => (
                <li key={g.slotIds[0]}>
                  • {g.count} slot{g.count > 1 ? "s" : ""} ({formatRange(g.start, g.end)}) — $
                  {g.rate.toFixed(2)}
                </li>
              ))}
              {shownGroups.length === 0 && (
                <li className="text-muted-foreground">None.</li>
              )}
            </ul>
            <div className="border-t pt-2">
              <Row
                label="Total Time/Slots"
                value={`${shownSlots.length} (${formatMinutes(shownMinutes)})`}
              />
              <Row label="Total Cost" value={`$${shownCost.toFixed(2)}`} />
            </div>
          </div>

          {!reserved && (
            <div className="border rounded-md p-3 space-y-4">
              <p className="font-semibold text-sm">Active Slots</p>
              <ActiveZone
                title="Winning"
                slots={winning}
                tone="win"
                currentWinningRate={currentWinningRate}
                onRaise={raiseRate}
                readOnly={readOnly}
              />
              <div className="border-t" />
              <ActiveZone
                title="Losing"
                slots={losing}
                tone="lose"
                currentWinningRate={currentWinningRate}
                onRaise={raiseRate}
                readOnly={readOnly}
              />
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          {reserved ? (
            <Row label="Total Amount of Reserved Time" value={formatMinutes(shownMinutes)} />
          ) : (
            <>
              <Row label="Unacquired Amount of Time" value={formatMinutes(unacquiredMinutes)} />
              <Row label="Available Amount of Time" value={formatMinutes(availableMinutes)} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
