import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentAdvertiserId } from "@/utils/currentAdvertiser";
import { logAdvertiserAction } from "@/utils/advertiserHistory";

export interface LoadPayment {
  id: string;
  identifier: string;
  amount: number;
  payment_method: string;
  crypto_currency: string | null;
  from_address: string | null;
  to_address: string | null;
  payment_status: "pending" | "approved";
  created_at: string;
  approved_at: string | null;
  owner_id?: string | null;
  source?: string;
}

export function useAdvertiserLoadPayments(options?: { allOwners?: boolean }) {
  const allOwners = options?.allOwners ?? false;
  const [payments, setPayments] = useState<LoadPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    let query = supabase
      .from("advertiser_load_payments" as never)
      .select("*")
      .order("created_at", { ascending: false });
    if (!allOwners) {
      const ownerId = getCurrentAdvertiserId();
      if (!ownerId) { setPayments([]); setLoading(false); return; }
      query = query.eq("owner_id", ownerId) as typeof query;
    }
    const { data, error } = await query;
    if (!error) setPayments((data ?? []) as unknown as LoadPayment[]);
    setLoading(false);
  }, [allOwners]);

  useEffect(() => {
    fetchPayments();
    const ch = supabase
      .channel(`load_payments-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "advertiser_load_payments" }, fetchPayments)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchPayments]);

  const createPayment = async (payload: Omit<LoadPayment, "id" | "created_at" | "approved_at" | "payment_status"> & { payment_status?: "pending" | "approved" }) => {
    const ownerId = getCurrentAdvertiserId();
    const insertPayload: Record<string, unknown> = { ...payload };
    if (ownerId) insertPayload.owner_id = ownerId;
    const { data, error } = await supabase
      .from("advertiser_load_payments" as never)
      .insert(insertPayload as never)
      .select()
      .single();
    if (error) { console.error(error); return null; }
    await fetchPayments();
    return data as unknown as LoadPayment;
  };

  const approvePayment = async (id: string) => {
    const p = payments.find((x) => x.id === id);
    if (!p) return false;
    const { error } = await supabase
      .from("advertiser_load_payments" as never)
      .update({ payment_status: "approved", approved_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) { console.error(error); return false; }
    const ownerId = (p as unknown as { owner_id?: string }).owner_id;
    const source = (p as unknown as { source?: string }).source ?? "load_fund";

    if (source.startsWith("ad_campaign") && ownerId) {
      // Activate the matching pending ad campaign (most recent for this owner/title)
      const campaignTitle = source.replace(/^ad_campaign:/, "");
      const { data: pending } = await supabase
        .from("ad_campaigns")
        .select("id, runtime_minutes")
        .eq("advertiser_id", ownerId)
        .eq("title", campaignTitle)
        .eq("payment_status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pending) {
        const starts = new Date();
        const ends = new Date(starts.getTime() + Number((pending as { runtime_minutes: number }).runtime_minutes) * 60_000);
        await supabase.from("ad_campaigns").update({
          payment_status: "approved",
          status: "live",
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
        }).eq("id", (pending as { id: string }).id);
      }
    } else if (ownerId) {
      // Load-fund deposit — credit advertiser balance
      const { data: bal } = await supabase
        .from("advertiser_balances")
        .select("load_amount")
        .eq("owner_id", ownerId)
        .maybeSingle();
      const current = Number(bal?.load_amount ?? 0);
      if (bal) {
        await supabase
          .from("advertiser_balances")
          .update({ load_amount: current + Number(p.amount) })
          .eq("owner_id", ownerId);
      } else {
        await supabase
          .from("advertiser_balances")
          .insert({ owner_id: ownerId, identifier: ownerId, load_amount: Number(p.amount), reserved_minutes: 0 } as never);
      }
      await logAdvertiserAction("fund_approved", {
        ownerId,
        targetId: p.id,
        targetType: "payment",
        metadata: {
          amount: Number(p.amount),
          from_address: p.from_address ?? "",
          to_address: p.to_address ?? "",
          approved_at: new Date().toISOString(),
        },
      });
    }
    await fetchPayments();
    return true;
  };

  return { payments, loading, createPayment, approvePayment, refetch: fetchPayments };
}