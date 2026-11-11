import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentAdvertiserId } from "@/utils/currentAdvertiser";
import { logAdvertiserAction } from "@/utils/advertiserHistory";
import { releaseHold } from "@/utils/advertiserFunds";

export type AdBidStatus = "ongoing" | "won" | "lost" | "expired" | "retracted";

export interface AdBid {
  id: string;
  name?: string;
  identifier: string;
  country_targets: string[];
  age_target: string;
  contest_targets: string[];
  window_start: string;
  window_end: string;
  runtime_minutes: number;
  rate_per_slot: number;
  status: AdBidStatus;
  created_at: string;
  resolved_at: string | null;
  owner_id?: string | null;
}

export function useAdBids() {
  const [bids, setBids] = useState<AdBid[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBids = useCallback(async () => {
    const ownerId = getCurrentAdvertiserId();
    if (!ownerId) { setBids([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("ad_bids" as never)
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    if (!error) setBids((data ?? []) as unknown as AdBid[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBids();
    const ch = supabase
      .channel(`ad_bids-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_bids" }, fetchBids)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchBids]);

  const createBid = async (payload: Omit<AdBid, "id" | "created_at" | "resolved_at" | "status"> & { status?: AdBidStatus }) => {
    const ownerId = getCurrentAdvertiserId();
    const insertPayload: Record<string, unknown> = { ...payload };
    if (ownerId) insertPayload.owner_id = ownerId;
    const { data, error } = await supabase
      .from("ad_bids" as never)
      .insert(insertPayload as never)
      .select()
      .single();
    if (error) { console.error(error); return null; }
    await fetchBids();
    return data as unknown as AdBid;
  };

  const updateBid = async (id: string, patch: Partial<AdBid>) => {
    const { error } = await supabase
      .from("ad_bids" as never)
      .update(patch as never)
      .eq("id", id);
    if (error) { console.error(error); return false; }
    await fetchBids();
    return true;
  };

  /** Close an ongoing bid: release every still-contested slot and mark it expired. */
  const closeBid = async (id: string) => {
    // refund the money held for slots that never locked in
    const { data: open } = await supabase
      .from("ad_bid_slots" as never)
      .select("rate, owner_id")
      .eq("bid_id", id)
      .eq("state", "contested");
    const openSlots = (open ?? []) as unknown as { rate: number; owner_id: string | null }[];
    const refundByOwner = new Map<string, number>();
    openSlots.forEach((s) => {
      if (!s.owner_id) return;
      refundByOwner.set(s.owner_id, (refundByOwner.get(s.owner_id) ?? 0) + Number(s.rate));
    });
    await Promise.all(
      Array.from(refundByOwner.entries()).map(([owner, amt]) => releaseHold(owner, amt)),
    );
    await supabase
      .from("ad_bid_slots" as never)
      .delete()
      .eq("bid_id", id)
      .eq("state", "contested");
    const ok = await updateBid(id, {
      status: "expired",
      resolved_at: new Date().toISOString(),
    });
    if (ok) {
      const b = bids.find((x) => x.id === id);
      await logAdvertiserAction("bid_stopped", {
        targetId: id,
        targetType: "bid",
        metadata: { name: b?.name ?? "", created_at: b?.created_at ?? null },
      });
    }
    return ok;
  };

  return { bids, loading, createBid, updateBid, closeBid, refetch: fetchBids };
}

/** Display title for a bid: custom name plus the date it was placed. */
export function bidTitle(b: AdBid) {
  const date = new Date(b.created_at).toLocaleString();
  return b.name ? `${b.name} — ${date}` : date;
}