import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdCampaign } from "@/types/admin";
import { getCurrentAdvertiserId } from "@/utils/currentAdvertiser";
import { logAdvertiserAction } from "@/utils/advertiserHistory";

export function useAdCampaigns() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    try {
      const ownerId = getCurrentAdvertiserId();
      if (!ownerId) {
        setCampaigns([]);
        return;
      }
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*")
        .eq("advertiser_id", ownerId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const now = new Date();
      const list = (data || []) as unknown as AdCampaign[];

      // Auto-expire any live campaigns past ends_at
      const expiredIds = list
        .filter((c) => c.status === "live" && c.ends_at && new Date(c.ends_at) < now)
        .map((c) => c.id);
      if (expiredIds.length) {
        await supabase
          .from("ad_campaigns")
          .update({ status: "expired" })
          .in("id", expiredIds);
        list.forEach((c) => {
          if (expiredIds.includes(c.id)) c.status = "expired";
        });
      }

      setCampaigns(list);
    } catch (e) {
      console.error("fetch campaigns error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    const ch = supabase
      .channel(`campaigns-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_campaigns" }, () => fetchCampaigns())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchCampaigns]);

  const createCampaign = async (
    payload: Partial<AdCampaign> & { overlay_id: string; title: string }
  ) => {
    const ownerId = getCurrentAdvertiserId();
    const insertPayload: Record<string, unknown> = { ...payload };
    if (ownerId) insertPayload.advertiser_id = ownerId;
    const { data, error } = await supabase
      .from("ad_campaigns")
      .insert(insertPayload as never)
      .select()
      .single();
    if (error) {
      console.error(error);
      return null;
    }
    await fetchCampaigns();
    return data as unknown as AdCampaign;
  };

  const updateCampaign = async (id: string, patch: Partial<AdCampaign>) => {
    const { error } = await supabase
      .from("ad_campaigns")
      .update({ ...patch, updated_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) {
      console.error(error);
      return false;
    }
    await fetchCampaigns();
    return true;
  };

  const deleteCampaign = async (id: string) => {
    const title = campaigns.find((c) => c.id === id)?.title ?? "";
    const { error } = await supabase.from("ad_campaigns").delete().eq("id", id);
    if (error) {
      console.error(error);
      return false;
    }
    await logAdvertiserAction("advertisement_deleted", { targetId: id, targetType: "campaign", metadata: { title } });
    await fetchCampaigns();
    return true;
  };

  return { campaigns, loading, createCampaign, updateCampaign, deleteCampaign, refetch: fetchCampaigns };
}