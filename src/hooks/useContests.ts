import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Contest, ContestWithParticipants } from "@/types/contest";

export function useContests() {
  const [activeContests, setActiveContests] = useState<ContestWithParticipants[]>([]);
  const [pendingContests, setPendingContests] = useState<ContestWithParticipants[]>([]);
  const [expiredContests, setExpiredContests] = useState<ContestWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContests = useCallback(async () => {
    setLoading(true);
    try {
      // First, update any contests that have passed their end time
      await supabase
        .from('contests')
        .update({ status: 'expired' })
        .eq('status', 'active')
        .lt('ends_at', new Date().toISOString());

      // Fetch all approved contests (visible to players)
      const { data: approvedContests, error: approvedError } = await supabase
        .from('contests')
        .select('*')
        .eq('approval_status', 'approved')
        .order('ends_at', { ascending: true });

      if (approvedError) throw approvedError;

      // Fetch pending contests (upcoming - awaiting approval)
      const { data: pendingData, error: pendingError } = await supabase
        .from('contests')
        .select('*')
        .eq('approval_status', 'pending')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      // Get participant counts for approved contests
      const contestsWithCounts: ContestWithParticipants[] = await Promise.all(
        (approvedContests || []).map(async (contest) => {
          const { data: uniquePlayers } = await supabase
            .from('contest_scores')
            .select('player_name')
            .eq('contest_id', contest.id);

          const uniqueCount = new Set(uniquePlayers?.map(p => p.player_name) || []).size;

          return {
            ...contest,
            status: contest.status as 'active' | 'expired',
            participant_count: uniqueCount
          };
        })
      );

      // Format pending contests
      const pendingWithCounts: ContestWithParticipants[] = (pendingData || []).map(contest => ({
        ...contest,
        status: contest.status as 'active' | 'expired',
        participant_count: 0
      }));

      setActiveContests(contestsWithCounts.filter(c => c.status === 'active'));
      setPendingContests(pendingWithCounts);
      setExpiredContests(contestsWithCounts.filter(c => c.status === 'expired'));
    } catch (error) {
      console.error('Error fetching contests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  return { activeContests, pendingContests, expiredContests, loading, refetch: fetchContests };
}
