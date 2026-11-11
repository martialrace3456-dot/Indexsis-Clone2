import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Gavel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdBids } from "@/hooks/useAdBids";
import { createSlotsForBid } from "@/hooks/useBidSlots";
import { useBiddingAnalytics } from "@/hooks/useBiddingAnalytics";
import { toast } from "sonner";
import { getCurrentAdvertiserId } from "@/utils/currentAdvertiser";
import { useAdvertiserView } from "@/contexts/AdvertiserView";
import { logAdvertiserAction } from "@/utils/advertiserHistory";
import { getBalance, hold } from "@/utils/advertiserFunds";

const AGE_OPTS = [
  { value: "all", label: "All" },
  { value: "above_18", label: "Above 18" },
  { value: "above_14", label: "Above 14" },
  { value: "above_12", label: "Above 12" },
];

function MultiPopover({ label, options, selected, onChange }: {
  label: string; options: { value: string; label: string }[]; selected: string[]; onChange: (s: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const isAll = selected.length === 0;
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">{isAll ? "All" : `${selected.length} selected`}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <Input className="mb-2 h-8" placeholder={`Search ${label}…`} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-60 overflow-y-auto">
          <button type="button" onClick={() => onChange([])} className="flex w-full items-center justify-between py-1 px-2 hover:bg-accent rounded text-sm">
            <span>All</span>{isAll && <Check className="h-4 w-4" />}
          </button>
          {filtered.map((o) => (
            <button key={o.value} type="button"
              onClick={() => selected.includes(o.value) ? onChange(selected.filter((x) => x !== o.value)) : onChange([...selected, o.value])}
              className="flex w-full items-center justify-between py-1 px-2 hover:bg-accent rounded text-sm">
              <span className="truncate text-left">{o.label}</span>
              {selected.includes(o.value) && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function BidSection() {
  const { createBid } = useAdBids();
  const [bidName, setBidName] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [age, setAge] = useState("all");
  const [contests, setContests] = useState<string[]>([]);
  const [start, setStart] = useState<string>(() => new Date(Date.now() + 30 * 60_000).toISOString().slice(0, 16));
  const [end, setEnd] = useState<string>(() => new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [runtime, setRuntime] = useState(60);
  const [rate, setRate] = useState(0.5);
  const [countryOpts, setCountryOpts] = useState<{ value: string; label: string }[]>([]);
  const [contestOpts, setContestOpts] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: pl }, { data: ct }] = await Promise.all([
        supabase.from("players").select("country").not("country", "is", null),
        supabase.from("contests").select("id, name").eq("status", "active"),
      ]);
      const uniq = Array.from(new Set((pl ?? []).map((p: { country: string | null }) => p.country).filter(Boolean) as string[]));
      setCountryOpts(uniq.map((c) => ({ value: c, label: c })));
      setContestOpts((ct ?? []).map((c: { id: string; name: string }) => ({ value: c.id, label: c.name })));
    })();
  }, []);

  // estimate available runtime in selected window from analytics volume
  const { bins } = useBiddingAnalytics("playtime", { countries, age, contests, ads: [] });
  const availableMinutes = useMemo(() => {
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();
    return bins.filter((bn) => bn.time >= a && bn.time <= b).reduce((s, bn) => s + bn.volume * 10, 0);
  }, [bins, start, end]);

  // biddable period: from "now + 30min" to 4 days out
  const biddableFrom = new Date(Date.now() + 30 * 60_000);
  const biddableTo = new Date(Date.now() + 4 * 86400000);

  const view = useAdvertiserView();
  const viewOnly = !!view?.viewOnly;
  if (viewOnly) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Gavel className="h-4 w-4" /> Bid</h3>
        <p className="text-sm text-muted-foreground">
          Read-only view — placing bids is disabled for this account view.
        </p>
      </div>
    );
  }

  const handleBid = async () => {
    const snapRuntime = Math.max(10, Math.round(runtime / 10) * 10);
    if (snapRuntime > availableMinutes) { toast.error("Runtime exceeds available volume"); return; }
    if (rate < 0) { toast.error("Rate must be ≥ 0"); return; }
    const ownerId = getCurrentAdvertiserId();
    const cost = (snapRuntime / 10) * rate;
    const funds = await getBalance(ownerId);
    if (cost > funds.available) {
      toast.error(`Not enough funds — this bid needs $${cost.toFixed(2)} but only $${funds.available.toFixed(2)} is available. Load funds first.`);
      return;
    }
    const b = await createBid({
      name: bidName.trim(),
      identifier: ownerId ?? "self",
      country_targets: countries,
      age_target: age,
      contest_targets: contests,
      window_start: new Date(start).toISOString(),
      window_end: new Date(end).toISOString(),
      runtime_minutes: snapRuntime,
      rate_per_slot: rate,
      status: "ongoing",
    });
    if (b) {
      await createSlotsForBid({
        id: b.id,
        owner_id: ownerId,
        window_start: new Date(start).toISOString(),
        window_end: new Date(end).toISOString(),
        runtime_minutes: snapRuntime,
        rate_per_slot: rate,
      });
      await hold(ownerId, cost);
      await logAdvertiserAction("bid_placed", {
        targetId: b.id,
        targetType: "bid",
        metadata: { name: bidName.trim(), runtime_minutes: snapRuntime, amount: cost },
      });
      setBidName("");
      toast.success(`Bid placed — $${cost.toFixed(2)} held from your balance`);
    }
    else toast.error("Failed to place bid");
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><Gavel className="h-4 w-4" /> Bid</h3>

      <div className="space-y-1">
        <Label>Bid Name</Label>
        <Input
          placeholder="Name this bid (optional)"
          value={bidName}
          onChange={(e) => setBidName(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label>Biddable Time Period</Label>
        <div className="flex items-center gap-2">
          <Input readOnly value={biddableFrom.toLocaleString()} />
          <span className="text-sm">To</span>
          <Input readOnly value={biddableTo.toLocaleString()} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between"><Label>Country</Label><MultiPopover label="Countries" options={countryOpts} selected={countries} onChange={setCountries} /></div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label>Age</Label>
            <Popover>
              <PopoverTrigger asChild><Button variant="outline" size="sm">{AGE_OPTS.find((a) => a.value === age)?.label}</Button></PopoverTrigger>
              <PopoverContent className="w-44 p-2">
                {AGE_OPTS.map((a) => (
                  <button key={a.value} type="button" onClick={() => setAge(a.value)}
                    className="flex w-full items-center justify-between py-1 px-2 hover:bg-accent rounded text-sm">
                    <span>{a.label}</span>{age === a.value && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between"><Label>Contest</Label><MultiPopover label="Contests" options={contestOpts} selected={contests} onChange={setContests} /></div>
      </div>

      <div className="space-y-1">
        <Label>Time period to bid within</Label>
        <div className="flex items-center gap-2">
          <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          <span className="text-sm">To</span>
          <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between border rounded-md p-3">
        <span className="text-sm">Approximate runtime available to bid for</span>
        <span className="font-semibold">{availableMinutes} min</span>
      </div>

      <div className="flex items-center gap-3">
        <Label className="w-56 shrink-0">Runtime to Bid for (min)</Label>
        <Input type="number" min={10} step={10} value={runtime}
          onChange={(e) => setRuntime(Math.max(10, Math.round(parseInt(e.target.value || "10", 10) / 10) * 10))} />
      </div>

      <div className="flex items-center gap-3">
        <Label className="w-56 shrink-0">Bid Rate Amount per 10-min slot</Label>
        <Input type="number" min={0} step="0.01" value={rate}
          onChange={(e) => setRate(Math.max(0, parseFloat(e.target.value || "0")))} />
      </div>

      <Button onClick={handleBid} className="w-full md:w-auto">Bid</Button>
    </div>
  );
}