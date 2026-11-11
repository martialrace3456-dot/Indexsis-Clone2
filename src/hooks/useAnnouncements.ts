import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Announcement } from "@/types/admin";

interface AnnouncementInsert {
  message: string;
  type: Announcement['type'];
  is_active: boolean;
  expires_at: string | null;
  targets: string[];
}

export function useAnnouncements(targetScreen?: string) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeAnnouncements, setActiveAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedData: Announcement[] = (data || []).map((item) => ({
        ...item,
        type: item.type as Announcement['type'],
        targets: (item as any).targets || ['all'],
      }));

      setAnnouncements(typedData);

      // Filter active announcements
      const now = new Date();
      let active = typedData.filter((a) => {
        if (!a.is_active) return false;
        if (a.expires_at && new Date(a.expires_at) < now) return false;
        return true;
      });

      // If targetScreen is provided, filter by targets
      if (targetScreen) {
        active = active.filter((a) => {
          const targets = a.targets || ['all'];
          return targets.includes('all') || targets.includes(targetScreen);
        });
      }

      setActiveAnnouncements(active);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  }, [targetScreen]);

  const createAnnouncement = async (announcement: AnnouncementInsert) => {
    try {
      const { error } = await supabase.from('announcements').insert(announcement);
      if (error) throw error;
      await fetchAnnouncements();
      return true;
    } catch (error) {
      console.error('Error creating announcement:', error);
      return false;
    }
  };

  const updateAnnouncement = async (id: string, updates: Partial<Announcement>) => {
    try {
      const { error } = await supabase.from('announcements').update(updates).eq('id', id);
      if (error) throw error;
      await fetchAnnouncements();
      return true;
    } catch (error) {
      console.error('Error updating announcement:', error);
      return false;
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      await fetchAnnouncements();
      return true;
    } catch (error) {
      console.error('Error deleting announcement:', error);
      return false;
    }
  };

  // Subscribe to realtime updates
  useEffect(() => {
    fetchAnnouncements();

    const channel = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAnnouncements]);

  return {
    announcements,
    activeAnnouncements,
    loading,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    refetch: fetchAnnouncements,
  };
}
