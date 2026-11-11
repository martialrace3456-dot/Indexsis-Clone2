import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OverlayContent } from "@/types/admin";
import { getCurrentAdvertiserId } from "@/utils/currentAdvertiser";
import { logAdvertiserAction } from "@/utils/advertiserHistory";

export function useOverlay(position?: string) {
  const [overlays, setOverlays] = useState<OverlayContent[]>([]);
  const [activeOverlay, setActiveOverlay] = useState<OverlayContent | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverlays = useCallback(async () => {
    try {
      const ownerId = getCurrentAdvertiserId();
      if (!ownerId) {
        setOverlays([]);
        setActiveOverlay(null);
        return;
      }

      let query = supabase
        .from('overlay_content')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (position) {
        query = query.eq('position', position);
      }

      const { data, error } = await query;

      if (error) throw error;

      const typedData = (data || []).map((item) => ({
        ...item,
        position: item.position as OverlayContent['position'],
        content_type: item.content_type as OverlayContent['content_type'],
      }));

      setOverlays(typedData);

      // Find active overlay for the position
      const now = new Date();
      const active = typedData.find((o) => {
        if (!o.is_active) return false;
        if (position && o.position !== position) return false;
        if (o.display_start && new Date(o.display_start) > now) return false;
        if (o.display_end && new Date(o.display_end) < now) return false;
        return true;
      });

      setActiveOverlay(active || null);
    } catch (error) {
      console.error('Error fetching overlays:', error);
    } finally {
      setLoading(false);
    }
  }, [position]);

  const createOverlay = async (overlay: Omit<OverlayContent, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const ownerId = getCurrentAdvertiserId();
      const payload: Record<string, unknown> = { ...overlay };
      if (ownerId) payload.owner_id = ownerId;
      const { data, error } = await supabase
        .from('overlay_content')
        .insert(payload as never)
        .select()
        .single();
      if (error) throw error;
      await logAdvertiserAction('ad_created', {
        targetId: (data as { id?: string } | null)?.id ?? null,
        targetType: 'ad',
        metadata: { title: overlay.title ?? '' },
      });
      await fetchOverlays();
      return true;
    } catch (error) {
      console.error('Error creating overlay:', error);
      return false;
    }
  };

  const updateOverlay = async (id: string, updates: Partial<OverlayContent>) => {
    try {
      const { error } = await supabase
        .from('overlay_content')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await fetchOverlays();
      return true;
    } catch (error) {
      console.error('Error updating overlay:', error);
      return false;
    }
  };

  const deleteOverlay = async (id: string) => {
    try {
      const title = overlays.find((o) => o.id === id)?.title ?? '';
      const { error } = await supabase.from('overlay_content').delete().eq('id', id);
      if (error) throw error;
      await logAdvertiserAction('ad_deleted', { targetId: id, targetType: 'ad', metadata: { title } });
      await fetchOverlays();
      return true;
    } catch (error) {
      console.error('Error deleting overlay:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchOverlays();
    const ch = supabase
      .channel(`overlay-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "overlay_content" }, () => fetchOverlays())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchOverlays]);

  return {
    overlays,
    activeOverlay,
    loading,
    createOverlay,
    updateOverlay,
    deleteOverlay,
    refetch: fetchOverlays,
  };
}
