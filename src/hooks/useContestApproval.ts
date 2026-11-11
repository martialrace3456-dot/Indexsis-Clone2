import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ContestWithApproval } from "@/types/admin";

export function useContestApproval() {
  const [contests, setContests] = useState<ContestWithApproval[]>([]);
  const [pendingContests, setPendingContests] = useState<ContestWithApproval[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get participant counts
      const contestsWithCounts: ContestWithApproval[] = await Promise.all(
        (data || []).map(async (contest) => {
          const { data: uniquePlayers } = await supabase
            .from('contest_scores')
            .select('player_name')
            .eq('contest_id', contest.id);

          const uniqueCount = new Set(uniquePlayers?.map((p) => p.player_name) || []).size;

          return {
            ...contest,
            status: contest.status as 'active' | 'expired',
            approval_status: contest.approval_status as 'pending' | 'approved' | 'rejected',
            participant_count: uniqueCount,
          };
        })
      );

      setContests(contestsWithCounts);
      setPendingContests(contestsWithCounts.filter((c) => c.approval_status === 'pending'));
    } catch (error) {
      console.error('Error fetching contests for approval:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const approveContest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contests')
        .update({ approval_status: 'approved', admin_notes: null })
        .eq('id', id);
      if (error) throw error;
      await fetchContests();
      return true;
    } catch (error) {
      console.error('Error approving contest:', error);
      return false;
    }
  };

  const rejectContest = async (id: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('contests')
        .update({ approval_status: 'rejected', admin_notes: notes })
        .eq('id', id);
      if (error) throw error;
      await fetchContests();
      return true;
    } catch (error) {
      console.error('Error rejecting contest:', error);
      return false;
    }
  };

  const deleteContest = async (id: string) => {
    try {
      // Delete contest scores first
      await supabase.from('contest_scores').delete().eq('contest_id', id);
      // Delete contest
      const { error } = await supabase.from('contests').delete().eq('id', id);
      if (error) throw error;
      await fetchContests();
      return true;
    } catch (error) {
      console.error('Error deleting contest:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  return {
    contests,
    pendingContests,
    loading,
    approveContest,
    rejectContest,
    deleteContest,
    refetch: fetchContests,
  };
}
