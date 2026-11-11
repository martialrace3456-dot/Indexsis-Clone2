CREATE TABLE public.advertiser_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.players(id),
  title text NOT NULL DEFAULT '',
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advertiser_links TO anon, authenticated;
GRANT ALL ON public.advertiser_links TO service_role;
ALTER TABLE public.advertiser_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone select links" ON public.advertiser_links FOR SELECT USING (true);
CREATE POLICY "anyone insert links" ON public.advertiser_links FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone update links" ON public.advertiser_links FOR UPDATE USING (true);
CREATE POLICY "anyone delete links" ON public.advertiser_links FOR DELETE USING (true);

ALTER TABLE public.ad_campaigns ADD COLUMN link_url text;

CREATE TABLE public.ad_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid,
  overlay_id uuid,
  campaign_title text NOT NULL DEFAULT '',
  media_url text,
  content_type text,
  link_url text,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_reports TO anon, authenticated;
GRANT ALL ON public.ad_reports TO service_role;
ALTER TABLE public.ad_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone insert reports" ON public.ad_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone select reports" ON public.ad_reports FOR SELECT USING (true);
CREATE POLICY "anyone update reports" ON public.ad_reports FOR UPDATE USING (true);
CREATE POLICY "anyone delete reports" ON public.ad_reports FOR DELETE USING (true);