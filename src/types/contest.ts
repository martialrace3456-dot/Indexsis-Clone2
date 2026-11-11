export interface Contest {
  id: string;
  name: string;
  description?: string | null;
  passcode_hash: string;
  duration_minutes: number;
  participant_limit: number;
  starts_at: string;
  ends_at: string;
  status: 'active' | 'expired';
  approval_status?: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface ContestScore {
  id: string;
  contest_id: string;
  player_name: string;
  total_score: number;
  game_date: string;
  created_at: string;
}

export interface ContestWithParticipants extends Contest {
  participant_count: number;
}
