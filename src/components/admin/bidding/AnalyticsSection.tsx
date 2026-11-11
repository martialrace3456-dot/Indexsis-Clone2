import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, BarChart3, LineChart as LineIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdCampaigns } from "@/hooks/useAdCampaigns";
import { useAdBids } from "@/hooks/useAdBids";
import { useBiddingAnalytics, AnalyticsParameter, BiddingFilters } from "@/hooks/useBiddingAnalytics";
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, Tooltip, XAxis, YAxis, ResponsiveContainer, Cell,
} from "recharts";

const AGE_OPTS = [
  { value: "all", label: "All" },
  { value: "above_18", label: "Above 18" },
  { value: "above_16", label: "Above 16" },
  { value: "above_12", label: "Above 12" },
];

type YAxisParam = AnalyticsParameter | "ads";

const PARAMS: { value: YAxisParam; label: string }[] = [
  { value: "playtime", label: "Aggregate Playtime (min)" },
  { value: "matches", label: "Matches" },
  { value: "rounds", label: "Rounds" },
  { value: "ads", label: "Ads" },
];

function MultiPopover({
  label, options, selected, onChange, searchable = true,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (s: string[]) => void;
  searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const isAll = selected.length === 0;
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  const toggle = (v: string) => {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v]);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          {label}: {isAll ? "All" : `${selected.length} selected`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        {searchable && <Input className="mb-2 h-8" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />}
        <div className="max-h-60 overflow-y-auto">
          <button type="button" onClick={() => onChange([])}
            className="flex w-full items-center justify-between py-1 px-2 hover:bg-accent rounded text-sm">
            <span>All</span>{isAll && <Check className="h-4 w-4" />}
          </button>
          {filtered.map((o) => (
            <button key={o.value} type="button" onClick={() => toggle(o.value)}
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

function SinglePopover({
  label, options, selected, onChange,
}: { label: string; options: { value: string; label: string }[]; selected: string; onChange: (s: string) => void; }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          {label}: {options.find((o) => o.value === selected)?.label ?? selected}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className="flex w-full items-center justify-between py-1 px-2 hover:bg-accent rounded text-sm">
            <span>{o.label}</span>{selected === o.value && <Check className="h-4 w-4" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function AnalyticsSection({ adId }: { adId?: string } = {}) {
  const [parameter, setParameter] = useState<YAxisParam>(adId ? "ads" : "playtime");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [countryOpts, setCountryOpts] = useState<{ value: string; label: string }[]>([]);
  const [contestOpts, setContestOpts] = useState<{ value: string; label: string }[]>([]);
  const { campaigns } = useAdCampaigns();
  const { bids } = useAdBids();

  const [filters, setFilters] = useState<BiddingFilters>({
    countries: [], age: "all", contests: [], ads: adId ? [adId] : [],
  });
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  useEffect(() => {
    (async () => {
      const [{ data: pl }, { data: ct }] = await Promise.all([
        supabase.from("players").select("country").not("country", "is", null),
        supabase.from("contests").select("id, name"),
      ]);
      const uniq = Array.from(new Set((pl ?? []).map((p: { country: string | null }) => p.country).filter(Boolean) as string[]));
      setCountryOpts(uniq.map((c) => ({ value: c, label: c })));
      setContestOpts((ct ?? []).map((c: { id: string; name: string }) => ({ value: c.id, label: c.name })));
    })();
  }, []);

  const adOpts = useMemo(() => campaigns.map((c) => ({ value: c.id, label: c.title || "Untitled" })), [campaigns]);

  const effectiveParameter: AnalyticsParameter = parameter === "ads" ? "playtime" : parameter;
  const { bins } = useBiddingAnalytics(effectiveParameter, filters);

  // Compute volume series with classification per slot for stacking visualization
  const nowMs = Date.now();
  const chartData = useMemo(() => bins
    .filter((b) => {
      if (fromDate && b.time < fromDate.getTime()) return false;
      if (toDate && b.time > toDate.getTime() + 86400000) return false;
      return true;
    })
    .map((b) => {
    // Count my reserved slots for this bin
    const isPast = b.time + 10 * 60_000 <= nowMs;
    // We approximate "reserved" by looking at bids that won (status==='won') overlapping this bin
    const overlapping = bids.filter((bd) =>
      bd.status === "won" &&
      new Date(bd.window_start).getTime() <= b.time + 10 * 60_000 &&
      new Date(bd.window_end).getTime() >= b.time
    );
    const myReserved = overlapping.length; // every won bid by admin counts (admin only context)
    return {
      time: b.time,
      label: new Date(b.time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      past: b.past,
      predicted: b.predicted,
      volume: b.volume,
      myReserved,
      isPast,
      isFuture: b.isFuture,
    };
  }), [bins, bids, nowMs, fromDate, toDate]);

  const ChartComp = chartType === "line" ? LineChart : BarChart;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Analytics</h3>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-8", !fromDate && "text-muted-foreground")}>
                <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                {fromDate ? format(fromDate, "MMM d") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-8", !toDate && "text-muted-foreground")}>
                <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                {toDate ? format(toDate, "MMM d") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          {(fromDate || toDate) && (
            <Button variant="ghost" size="sm" className="h-8" onClick={() => { setFromDate(undefined); setToDate(undefined); }}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <MultiPopover label="Country" options={countryOpts} selected={filters.countries} onChange={(v) => setFilters({ ...filters, countries: v })} />
        <SinglePopover label="Age" options={AGE_OPTS} selected={filters.age} onChange={(v) => setFilters({ ...filters, age: v })} />
        <MultiPopover label="Contest" options={contestOpts} selected={filters.contests} onChange={(v) => setFilters({ ...filters, contests: v })} />
        {parameter === "ads" && !adId && (
          <MultiPopover label="Ads" options={adOpts} selected={filters.ads} onChange={(v) => setFilters({ ...filters, ads: v })} />
        )}
      </div>

      <div className="flex items-stretch gap-2">
        <div className="flex flex-col justify-center w-44 shrink-0">
          <Label className="text-xs mb-1">Y-Axis</Label>
          <Select value={parameter} onValueChange={(v) => setParameter(v as YAxisParam)}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PARAMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-h-[340px]">
          <ResponsiveContainer width="100%" height={340}>
            {chartType === "line" ? (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="volume" barSize={6} fillOpacity={0.5}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.isPast ? "#ef4444" : d.myReserved > 0 ? "#22c55e" : "#9ca3af"} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="past" stroke="#ef4444" dot={false} strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="predicted" stroke="#3b82f6" dot={false} strokeWidth={2} strokeDasharray="4 2" connectNulls />
              </ComposedChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="past">
                  {chartData.map((_, i) => <Cell key={i} fill="#ef4444" />)}
                </Bar>
                <Bar dataKey="predicted">
                  {chartData.map((_, i) => <Cell key={i} fill="#3b82f6" />)}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              {chartType === "line" ? <><LineIcon className="h-3.5 w-3.5 mr-1" /> Line Chart</> : <><BarChart3 className="h-3.5 w-3.5 mr-1" /> Bar Chart</>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1">
            <button type="button" onClick={() => setChartType("line")} className="flex w-full items-center gap-2 px-2 py-1 rounded hover:bg-accent text-sm">
              <LineIcon className="h-3.5 w-3.5" /> Line Chart {chartType === "line" && <Check className="h-3 w-3 ml-auto" />}
            </button>
            <button type="button" onClick={() => setChartType("bar")} className="flex w-full items-center gap-2 px-2 py-1 rounded hover:bg-accent text-sm">
              <BarChart3 className="h-3.5 w-3.5" /> Bar Chart {chartType === "bar" && <Check className="h-3 w-3 ml-auto" />}
            </button>
          </PopoverContent>
        </Popover>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <div className="flex items-center gap-2"><span className="inline-block w-4 h-0.5 bg-[#ef4444]" /> Past Data</div>
          <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-[#3b82f6]" /> Reserved Time</div>
          <div className="flex items-center gap-2"><span className="inline-block w-4 h-0.5 bg-[#3b82f6]" /> Predicted Data</div>
          <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-[#22c55e]" /> Personally Reserved</div>
          <div />
          <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-[#ef4444]" /> Past Time</div>
        </div>
      </div>
    </div>
  );
}