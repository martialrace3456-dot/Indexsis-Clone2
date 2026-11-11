-- Create table for storing game scores
CREATE TABLE public.scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  total_score NUMERIC(10, 2) NOT NULL,
  game_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to view scores
CREATE POLICY "Anyone can view scores"
ON public.scores
FOR SELECT
USING (true);

-- Create policy to allow anyone to insert scores
CREATE POLICY "Anyone can insert scores"
ON public.scores
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_scores_total_score ON public.scores(total_score DESC);
CREATE INDEX idx_scores_player_date ON public.scores(player_name, game_date DESC);