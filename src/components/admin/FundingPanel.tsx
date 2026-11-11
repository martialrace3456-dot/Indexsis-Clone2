import { useRef, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, History, Wallet, Download } from "lucide-react";
import { LoadFundPanel } from "./LoadFundPanel";
import { useAdvertiserBalance } from "@/hooks/useAdvertiserBalance";
import { useAdvertiserLoadPayments } from "@/hooks/useAdvertiserLoadPayments";
import { scrollSectionToTop } from "@/utils/scrollSection";
import { cn } from "@/lib/utils";

const NAV = [
  { id: "load", label: "Load Fund", icon: Download },
  { id: "balance", label: "Balance", icon: Wallet },
  { id: "activity", label: "Activity", icon: History },
] as const;

const METHOD_LABEL: Record<string, string> = {
  paypal: "PayPal", skrill: "Skrill", volet: "Volet", paypeer: "Paypeer", crypto: "Crypto",
};

export function FundingPanel() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const { loadAmount, heldAmount, available } = useAdvertiserBalance();
  const { payments } = useAdvertiserLoadPayments();
  const fundPayments = payments.filter((p) => !(p.source ?? "load_fund").startsWith("ad_campaign"));

  return (
    <div className="flex gap-3 border rounded-lg overflow-hidden">
      <div className={cn("flex flex-col border-r bg-muted/30 p-2 gap-2 transition-all", collapsed ? "w-12" : "w-40")}>
        <Button variant="ghost" size="icon" className="self-end" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <Button key={n.id} variant="ghost" title={n.label}
              className={cn("justify-start gap-2", collapsed && "justify-center px-0")}
              onClick={() => scrollSectionToTop(scrollRef.current, `#funding-${n.id}`)}>
              <Icon className="h-4 w-4" />
              {!collapsed && <span>{n.label}</span>}
            </Button>
          );
        })}
      </div>
      <div ref={scrollRef} className="flex-1 max-h-[75vh] overflow-y-auto p-4">
        <section id="funding-load" className="pb-8">
          <h3 className="text-lg font-semibold mb-4">Load Fund</h3>
          <LoadFundPanel />
        </section>
        <div className="border-t border-border" />
        <section id="funding-balance" className="py-8">
          <h3 className="text-lg font-semibold mb-4">Balance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
            <Box label="Total balance" value={loadAmount} />
            <Box label="On hold (bidding)" value={heldAmount} />
            <Box label="Net usable balance" value={available} strong />
          </div>
        </section>
        <div className="border-t border-border" />
        <section id="funding-activity" className="pt-8 min-h-[60vh]">
          <h3 className="text-lg font-semibold mb-4">Activity</h3>
          {fundPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No funding activity yet.</p>
          ) : (
            <div className="space-y-2">
              {fundPayments.map((p) => (
                <div key={p.id} className="rounded-lg border p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">${Number(p.amount).toFixed(2)} via {METHOD_LABEL[p.payment_method] ?? p.payment_method}{p.crypto_currency ? ` (${p.crypto_currency.toUpperCase()})` : ""}</span>
                    <Badge variant={p.payment_status === "approved" ? "default" : "secondary"}>
                      {p.payment_status === "approved" ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">Claimed {format(new Date(p.created_at), "MMM d, yyyy HH:mm")}</div>
                  {p.approved_at && <div className="text-xs text-muted-foreground">Approved by admin {format(new Date(p.approved_at), "MMM d, yyyy HH:mm")}</div>}
                  <div className="text-xs break-all text-muted-foreground">From {p.from_address || "—"} → To {p.to_address || "—"}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Box({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={cn("rounded-md border p-3", strong && "border-primary/50 bg-primary/5")}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">${value.toFixed(2)}</div>
    </div>
  );
}
