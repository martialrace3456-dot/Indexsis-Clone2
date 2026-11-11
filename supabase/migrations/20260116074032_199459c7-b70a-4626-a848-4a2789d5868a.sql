-- Add description column to contests
ALTER TABLE public.contests ADD COLUMN IF NOT EXISTS description text;

-- Add targets column to announcements (array of screen names)
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS targets text[] DEFAULT ARRAY['all']::text[];

-- Allow INSERT/UPDATE/DELETE on admin_settings
CREATE POLICY "Anyone can insert admin settings"
ON public.admin_settings
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update admin settings"
ON public.admin_settings
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete admin settings"
ON public.admin_settings
FOR DELETE
USING (true);

-- Allow INSERT/UPDATE/DELETE on overlay_content
CREATE POLICY "Anyone can insert overlay content"
ON public.overlay_content
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update overlay content"
ON public.overlay_content
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete overlay content"
ON public.overlay_content
FOR DELETE
USING (true);

-- Allow INSERT/UPDATE/DELETE on announcements
CREATE POLICY "Anyone can insert announcements"
ON public.announcements
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update announcements"
ON public.announcements
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete announcements"
ON public.announcements
FOR DELETE
USING (true);

-- Change default approval_status to 'pending' (new contests wait for approval when required)
ALTER TABLE public.contests ALTER COLUMN approval_status SET DEFAULT 'pending'::contest_approval_status;