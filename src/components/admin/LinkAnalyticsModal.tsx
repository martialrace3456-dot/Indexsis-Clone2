import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { bucketClicks } from "@/utils/linkClicks";

export function LinkAnalyticsModal({ open, onClose, url, title }: { open: boolean; onClose: () => void; url: string | null; title: string }) {
  const [clicks, setClicks] = useState<string[]>([]);
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [chart, setChart] = useState<"bar" | "line">("bar");

  useEffect(() => {
    if (!open || !url) return;
    const load = async () => {
      const { data } = await supabase.from("link_clicks").select("created_at").eq("url", url).order("created_at");
      setClicks((data ?? []).map((d) => d.created_at));
    };
    load();
    const ch = supabase
      .channel(`link-clicks-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "link_clicks" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open, url]);

  const inRange = useMemo(() => clicks.filter((c) => {
    const t = new Date(c).getTime();
    if (from && t < new Date(from).setHours(0, 0, 0, 0)) return false;
    if (to && t > new Date(to).setHours(23, 59, 59, 999)) return false;
    return true;
  }), [clicks, from, to]);

  const data = useMemo(() => bucketClicks(inRange).map((b) => ({ label: format(new Date(b.start), "MMM d HH:mm"), clicks: b.count })), [inRange]);
  const hours = data.length ? Math.max(1, (data.length * 10) / 60) : 1;

  const DatePick = ({ v, set, ph }: { v?: Date; set: (d?: Date) => void; ph: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8"><CalendarIcon className="h-3.5 w-3.5 mr-1" />{v ? format(v, "MMM d") : ph}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar mode="single" selected={v} onSelect={set} className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader><DialogTitle>Link Stats — {title || "Untitled link"}</DialogTitle></DialogHeader>
        <div className="flex justify-end items-center gap-2">
          <DatePick v={from} set={setFrom} ph="From" />
          <span className="text-xs text-muted-foreground">to</span>
          <DatePick v={to} set={setTo} ph="To" />
          {(from || to) && <Button variant="ghost" size="sm" className="h-8" onClick={() => { setFrom(undefined); setTo(undefined); }}>Clear</Button>}
        </div>
        <div className="h-[320px]">
          {data.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No clicks yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chart === "bar" ? (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" fontSize={10} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="clicks" fill="hsl(var(--primary))" />
                </BarChart>
              ) : (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" fontSize={10} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <Metric label="Total clicks" value={clicks.length} />
          <Metric label="Clicks in range" value={inRange.length} />
          <Metric label="Avg / hour" value={(inRange.length / hours).toFixed(2)} />
        </div>
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Select value={chart} onValueChange={(v) => setChart(v as "bar" | "line")}>
            <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Bar chart</SelectItem>
              <SelectItem value="line">Line chart</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
