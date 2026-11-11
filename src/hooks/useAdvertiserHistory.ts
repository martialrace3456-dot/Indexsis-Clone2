import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentAdvertiserId } from "@/utils/currentAdvertiser";
import { HistoryEntry } from "@/utils/advertiserHistory";

export function useAdvertiserHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    const ownerId = getCurrentAdvertiserId();
    if (!ownerId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("advertiser_history" as never)
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    if (!error) setEntries((data ?? []) as unknown as HistoryEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
    const ch = supabase
      .channel(`advertiser_history-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "advertiser_history" },
        fetchEntries,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchEntries]);

  const deleteEntry = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("advertiser_history" as never).delete().eq("id", id);
      if (error) {
        console.error(error);
        return false;
      }
      await fetchEntries();
      return true;
    },
    [fetchEntries],
  );

  return { entries, loading, deleteEntry, refetch: fetchEntries };
}
