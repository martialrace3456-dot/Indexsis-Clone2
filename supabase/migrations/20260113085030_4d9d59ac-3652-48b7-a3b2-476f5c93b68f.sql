-- Create contests table
CREATE TABLE public.contests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  passcode_hash text NOT NULL,
  duration_minutes integer NOT NULL,
  participant_limit integer NOT NULL DEFAULT 100,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create contest_scores table
CREATE TABLE public.contest_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  total_score numeric NOT NULL,
  game_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies for contests
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view contests"
  ON public.contests FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create contests"
  ON public.contests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update contests"
  ON public.contests FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete contests"
  ON public.contests FOR DELETE
  USING (true);

-- RLS Policies for contest_scores
ALTER TABLE public.contest_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view contest scores"
  ON public.contest_scores FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert contest scores"
  ON public.contest_scores FOR INSERT
  WITH CHECK (true);

-- Create index for faster contest score lookups
CREATE INDEX idx_contest_scores_contest_id ON public.contest_scores(contest_id);
CREATE INDEX idx_contests_status ON public.contests(status);
CREATE INDEX idx_contests_ends_at ON public.contests(ends_at);