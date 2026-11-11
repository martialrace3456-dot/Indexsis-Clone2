-- Create enum for contest approval status
CREATE TYPE public.contest_approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Add approval columns to contests table
ALTER TABLE public.contests 
ADD COLUMN approval_status public.contest_approval_status NOT NULL DEFAULT 'approved',
ADD COLUMN admin_notes TEXT;

-- Create admin_settings table for global configuration
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for game config)
CREATE POLICY "Anyone can view admin settings"
ON public.admin_settings
FOR SELECT
USING (true);

-- Only allow updates through edge functions (no direct user access)
-- We'll handle admin auth via secret URL pattern

-- Create overlay_content table
CREATE TABLE public.overlay_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position TEXT NOT NULL DEFAULT 'board-cover',
  content_type TEXT NOT NULL DEFAULT 'image',
  url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  display_start TIMESTAMP WITH TIME ZONE,
  display_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on overlay_content
ALTER TABLE public.overlay_content ENABLE ROW LEVEL SECURITY;

-- Anyone can view active overlays
CREATE POLICY "Anyone can view overlay content"
ON public.overlay_content
FOR SELECT
USING (true);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Anyone can view active announcements
CREATE POLICY "Anyone can view announcements"
ON public.announcements
FOR SELECT
USING (true);

-- Enable realtime for announcements
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;

-- Insert default admin settings
INSERT INTO public.admin_settings (key, value) VALUES
  ('require_contest_approval', 'false'),
  ('rounds_per_game', '7'),
  ('samples_per_round', '5'),
  ('sample_radius', '50'),
  ('min_dots', '25000'),
  ('max_dots', '100000');

-- Create storage bucket for overlay images
INSERT INTO storage.buckets (id, name, public) VALUES ('overlays', 'overlays', true);

-- Storage policies for overlays bucket
CREATE POLICY "Anyone can view overlay files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'overlays');

CREATE POLICY "Anyone can upload overlay files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'overlays');

CREATE POLICY "Anyone can update overlay files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'overlays');

CREATE POLICY "Anyone can delete overlay files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'overlays');