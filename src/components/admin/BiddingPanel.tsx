import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, Gavel, History, ChevronLeft, ChevronRight } from "lucide-react";
import { AnalyticsSection } from "./bidding/AnalyticsSection";
import { BidSection } from "./bidding/BidSection";
import { ActivitySection } from "./bidding/ActivitySection";
import { cn } from "@/lib/utils";
import { scrollSectionToTop } from "@/utils/scrollSection";

const NAV = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "bid", label: "Bid", icon: Gavel },
  { id: "activity", label: "Activity", icon: History },
] as const;

export function BiddingPanel() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const jumpTo = (id: string) => {
    scrollSectionToTop(scrollRef.current, `#bidding-${id}`);
  };

  return (
    <div className="flex gap-3 border rounded-lg overflow-hidden">
      <div className={cn("flex flex-col border-r bg-muted/30 p-2 gap-2 transition-all", collapsed ? "w-12" : "w-40")}>
        <Button variant="ghost" size="icon" className="self-end" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <Button
              key={n.id}
              variant="ghost"
              className={cn("justify-start gap-2", collapsed && "justify-center px-0")}
              onClick={() => jumpTo(n.id)}
              title={n.label}
            >
              <Icon className="h-4 w-4" />
              {!collapsed && <span>{n.label}</span>}
            </Button>
          );
        })}
      </div>
      <div ref={scrollRef} className="flex-1 max-h-[75vh] overflow-y-auto p-4">
        <section id="bidding-analytics" className="pb-8"><AnalyticsSection /></section>
        <div className="border-t border-border" />
        <section id="bidding-bid" className="py-8"><BidSection /></section>
        <div className="border-t border-border" />
        <section id="bidding-activity" className="pt-8"><ActivitySection /></section>
      </div>
    </div>
  );
}