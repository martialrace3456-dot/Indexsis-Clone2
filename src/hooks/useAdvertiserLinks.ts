import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentAdvertiserId } from "@/utils/currentAdvertiser";
import { logAdvertiserAction } from "@/utils/advertiserHistory";

export interface AdvertiserLink {
  id: string;
  owner_id: string | null;
  title: string;
  url: string;
  created_at: string;
}

export function normalizeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function useAdvertiserLinks() {
  const [links, setLinks] = useState<AdvertiserLink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    const ownerId = getCurrentAdvertiserId();
    if (!ownerId) { setLinks([]); setLoading(false); return; }
    const { data } = await supabase
      .from("advertiser_links")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    setLinks((data ?? []) as AdvertiserLink[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLinks();
    const ch = supabase
      .channel(`links-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "advertiser_links" }, () => fetchLinks())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchLinks]);

  const addLink = async (title: string, url: string) => {
    const ownerId = getCurrentAdvertiserId();
    if (!ownerId) return false;
    const { data, error } = await supabase
      .from("advertiser_links").insert({ owner_id: ownerId, title, url }).select().single();
    if (!error) {
      await logAdvertiserAction("link_created", {
        targetId: data?.id ?? null, targetType: "link", metadata: { title, url },
      });
      await fetchLinks();
    }
    return !error;
  };

  const deleteLink = async (id: string) => {
    const l = links.find((x) => x.id === id);
    const { error } = await supabase.from("advertiser_links").delete().eq("id", id);
    if (!error) {
      await logAdvertiserAction("link_deleted", {
        targetId: id, targetType: "link", metadata: { title: l?.title ?? "", url: l?.url ?? "" },
      });
      await fetchLinks();
    }
    return !error;
  };

  return { links, loading, addLink, deleteLink, refetch: fetchLinks };
}
