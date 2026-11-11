import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BidSlot, LOCK_MS, SLOT_MS, slotBoundaries } from "@/utils/bidSlots";
import { AdBid } from "@/hooks/useAdBids";
import { getCurrentAdvertiserId } from "@/utils/currentAdvertiser";
import { charge, releaseHold, hold, getBalance } from "@/utils/advertiserFunds";
import { toast } from "sonner";

/**
 * Loads the slot layer for one bid: the bidder's own slots plus every competing
 * slot in the same time range (needed to know who is winning each 10-min slot).
 */
export function useBidSlots(bid: AdBid | null) {
  const [mySlots, setMySlots] = useState<BidSlot[]>([]);
  const [allSlots, setAllSlots] = useState<BidSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const ownerId = getCurrentAdvertiserId();

  const fetchSlots = useCallback(async () => {
    if (!bid) return;
    setLoading(true);

    // 1. Lock slots that have entered the 30-minute closed horizon.
    const lockCutoff = new Date(Date.now() + LOCK_MS).toISOString();
    const { data: toLock } = await supabase
      .from("ad_bid_slots" as never)
      .select("*")
      .eq("state", "contested")
      .lt("slot_start", lockCutoff);

    const lockList = ((toLock ?? []) as unknown as BidSlot[]);
    if (lockList.length) {
      const byStart = new Map<string, BidSlot[]>();
      lockList.forEach((s) => {
        const k = new Date(s.slot_start).toISOString();
        byStart.set(k, [...(byStart.get(k) ?? []), s]);
      });
      await Promise.all(
        Array.from(byStart.values()).map(async (group) => {
          const best = group.reduce((a, b) => (Number(b.rate) > Number(a.rate) ? b : a));
          await Promise.all(
            group.map(async (s) => {
              const won = s.id === best.id;
              // settle the money for this slot exactly once
              const slotOwner = (s as unknown as { owner_id?: string | null }).owner_id ?? null;
              const alreadyCharged = !!(s as unknown as { charged?: boolean }).charged;
              if (!alreadyCharged) {
                if (won) await charge(slotOwner, Number(s.rate));
                else await releaseHold(slotOwner, Number(s.rate));
              }
              await supabase
                .from("ad_bid_slots" as never)
                .update({ state: won ? "won" : "lost", charged: true } as never)
                .eq("id", s.id);
            }),
          );
        }),
      );
    }

    // 2. Load this bid's slots.
    const { data: mine } = await supabase
      .from("ad_bid_slots" as never)
      .select("*")
      .eq("bid_id", bid.id)
      .order("slot_start", { ascending: true });
    const mineList = (mine ?? []) as unknown as BidSlot[];
    setMySlots(mineList);

    // 3. Load every slot inside the bid's window (all advertisers) for comparison.
    const { data: all } = await supabase
      .from("ad_bid_slots" as never)
      .select("*")
      .gte("slot_start", bid.window_start)
      .lte("slot_start", bid.window_end);
    setAllSlots((all ?? []) as unknown as BidSlot[]);
    setLoading(false);
  }, [bid]);

  useEffect(() => {
    fetchSlots();
    if (!bid) return;
    const ch = supabase
      .channel(`bid_slots_${bid.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ad_bid_slots" },
        fetchSlots,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchSlots, bid]);

  const bestRateByStart = useMemo(() => {
    const map = new Map<number, number>();
    allSlots.forEach((s) => {
      const t = new Date(s.slot_start).getTime();
      map.set(t, Math.max(map.get(t) ?? 0, Number(s.rate)));
    });
    return map;
  }, [allSlots]);

  const now = Date.now();

  const acquired = useMemo(() => mySlots.filter((s) => s.state === "won"), [mySlots]);

  const contested = useMemo(
    () =>
      mySlots.filter(
        (s) => s.state === "contested" && new Date(s.slot_start).getTime() >= now + LOCK_MS,
      ),
    [mySlots, now],
  );

  const winning = useMemo(
    () =>
      contested.filter(
        (s) => Number(s.rate) >= (bestRateByStart.get(new Date(s.slot_start).getTime()) ?? 0),
      ),
    [contested, bestRateByStart],
  );

  const losing = useMemo(
    () =>
      contested.filter(
        (s) => Number(s.rate) < (bestRateByStart.get(new Date(s.slot_start).getTime()) ?? 0),
      ),
    [contested, bestRateByStart],
  );

  const availableMinutes = useMemo(() => {
    if (!bid) return 0;
    const boundaries = slotBoundaries(
      new Date(bid.window_start).getTime(),
      new Date(bid.window_end).getTime(),
    );
    const takenStarts = new Set(
      allSlots
        .filter((s) => s.state === "won")
        .map((s) => new Date(s.slot_start).getTime()),
    );
    return boundaries.filter((t) => !takenStarts.has(t)).length * 10;
  }, [bid, allSlots]);

  const acquiredMinutes = acquired.length * 10;
  const unacquiredMinutes = Math.max(0, (bid?.runtime_minutes ?? 0) - acquiredMinutes);

  const totalCost = acquired.reduce((sum, s) => sum + Number(s.rate), 0);

  const raiseRate = useCallback(
    async (slotIds: string[], increment: number) => {
      const targets = mySlots.filter((s) => slotIds.includes(s.id));
      if (!targets.length || increment <= 0) return false;
      const extra = targets.length * increment;
      const funds = await getBalance(ownerId);
      if (extra > funds.available) {
        toast.error(
          `Not enough funds — raising these bids needs $${extra.toFixed(2)} but only $${funds.available.toFixed(2)} is available.`,
        );
        return false;
      }
      await Promise.all(
        targets.map((s) =>
          supabase
            .from("ad_bid_slots" as never)
            .update({ rate: Number(s.rate) + increment } as never)
            .eq("id", s.id),
        ),
      );
      await hold(ownerId, extra);
      await fetchSlots();
      return true;
    },
    [mySlots, fetchSlots, ownerId],
  );

  const currentWinningRate = useCallback(
    (slotStart: string) => bestRateByStart.get(new Date(slotStart).getTime()) ?? 0,
    [bestRateByStart],
  );

  return {
    loading,
    ownerId,
    acquired,
    winning,
    losing,
    acquiredMinutes,
    unacquiredMinutes,
    availableMinutes,
    totalCost,
    raiseRate,
    currentWinningRate,
    refetch: fetchSlots,
  };
}

/** Create the per-slot rows for a freshly placed bid. */
export async function createSlotsForBid(bid: {
  id: string;
  owner_id?: string | null;
  window_start: string;
  window_end: string;
  runtime_minutes: number;
  rate_per_slot: number;
}) {
  const boundaries = slotBoundaries(
    new Date(bid.window_start).getTime(),
    new Date(bid.window_end).getTime(),
  );
  const needed = Math.max(1, Math.round(bid.runtime_minutes / 10));
  const chosen = boundaries.slice(0, needed);
  if (!chosen.length) return;
  const rows = chosen.map((t) => ({
    bid_id: bid.id,
    owner_id: bid.owner_id ?? null,
    slot_start: new Date(t).toISOString(),
    slot_end: new Date(t + SLOT_MS).toISOString(),
    rate: bid.rate_per_slot,
    state: "contested",
  }));
  const { error } = await supabase.from("ad_bid_slots" as never).insert(rows as never);
  if (error) console.error("slot creation failed", error);
}
