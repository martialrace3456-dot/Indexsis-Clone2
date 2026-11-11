import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentAdvertiserId } from "@/utils/currentAdvertiser";

export function useAdvertiserBalance() {
  const [loadAmount, setLoadAmount] = useState(0);
  const [heldAmount, setHeldAmount] = useState(0);
  const [spentAmount, setSpentAmount] = useState(0);
  const [reservedMinutes, setReservedMinutes] = useState(0);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const ownerId = getCurrentAdvertiserId();
    if (!ownerId) { setLoading(false); return; }
    const { data } = await supabase
      .from("advertiser_balances")
      .select("load_amount, held_amount, spent_amount, reserved_minutes")
      .eq("owner_id", ownerId)
      .maybeSingle();
    setLoadAmount(Number(data?.load_amount ?? 0));
    setHeldAmount(Number(data?.held_amount ?? 0));
    setSpentAmount(Number(data?.spent_amount ?? 0));
    setReservedMinutes(Number(data?.reserved_minutes ?? 0));
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
    const ch = supabase
      .channel(`advertiser_balances-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "advertiser_balances" }, refetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refetch]);

  const available = loadAmount - heldAmount - spentAmount;

  return { loadAmount, heldAmount, spentAmount, available, reservedMinutes, loading, refetch };
}
