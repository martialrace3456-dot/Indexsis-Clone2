import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentAdvertiserId } from "@/utils/currentAdvertiser";
import { BidSlot } from "@/utils/bidSlots";
import { AdBid, useAdBids } from "@/hooks/useAdBids";

export type ReservedCategory = "functional" | "expired" | "harnessed";

export interface ReservedBidGroup {
  bid: AdBid;
  slots: BidSlot[];
  minutes: number;
}

export function categoriseSlot(s: BidSlot, now = Date.now()): ReservedCategory {
  if (s.used_at) return "harnessed";
  return new Date(s.slot_end).getTime() > now ? "functional" : "expired";
}

/**
 * All won (reserved) slots belonging to the signed-in advertiser, grouped per bid
 * and split into Functional / Expired / Harnessed buckets.
 */
export function useReservedSlots() {
  const { bids } = useAdBids();
  const [slots, setSlots] = useState<BidSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSlots = useCallback(async () => {
    const ownerId = getCurrentAdvertiserId();
    if (!ownerId) {
      setSlots([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("ad_bid_slots" as never)
      .select("*")
      .eq("owner_id", ownerId)
      .eq("state", "won")
      .order("slot_start", { ascending: true });
    if (!error) setSlots((data ?? []) as unknown as BidSlot[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSlots();
    const ch = supabase
      .channel(`reserved_slots-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ad_bid_slots" },
        fetchSlots,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchSlots]);

  const byCategory = useMemo(() => {
    const now = Date.now();
    const out: Record<ReservedCategory, ReservedBidGroup[]> = {
      functional: [],
      expired: [],
      harnessed: [],
    };
    (Object.keys(out) as ReservedCategory[]).forEach((cat) => {
      const inCat = slots.filter((s) => categoriseSlot(s, now) === cat);
      const map = new Map<string, BidSlot[]>();
      inCat.forEach((s) => map.set(s.bid_id, [...(map.get(s.bid_id) ?? []), s]));
      out[cat] = Array.from(map.entries())
        .map(([bidId, list]) => {
          const bid = bids.find((b) => b.id === bidId);
          return bid ? { bid, slots: list, minutes: list.length * 10 } : null;
        })
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(b!.bid.created_at).getTime() - new Date(a!.bid.created_at).getTime(),
        ) as ReservedBidGroup[];
    });
    return out;
  }, [slots, bids]);

  const totals = useMemo(
    () => ({
      functional: byCategory.functional.reduce((s, g) => s + g.minutes, 0),
      expired: byCategory.expired.reduce((s, g) => s + g.minutes, 0),
      harnessed: byCategory.harnessed.reduce((s, g) => s + g.minutes, 0),
    }),
    [byCategory],
  );

  return { loading, slots, byCategory, totals, refetch: fetchSlots };
}
