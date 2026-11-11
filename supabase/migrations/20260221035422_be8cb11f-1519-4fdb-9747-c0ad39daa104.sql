
-- Players table for account system
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Anyone can update players" ON public.players FOR UPDATE USING (true);

-- Add player_id and contest columns to scores
ALTER TABLE public.scores ADD COLUMN player_id uuid REFERENCES public.players(id);
ALTER TABLE public.scores ADD COLUMN contest_id uuid;
ALTER TABLE public.scores ADD COLUMN contest_name text;
ALTER TABLE public.scores ADD COLUMN show_contest boolean NOT NULL DEFAULT true;

-- Allow updating scores for show/hide/delete contest features
CREATE POLICY "Anyone can update scores" ON public.scores FOR UPDATE USING (true);

-- Add player_id to contest_scores
ALTER TABLE public.contest_scores ADD COLUMN player_id uuid REFERENCES public.players(id);
