ALTER TABLE public.ad_bids ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';

ALTER TABLE public.ad_bid_slots ADD COLUMN IF NOT EXISTS used_at timestamp with time zone;
ALTER TABLE public.ad_bid_slots ADD COLUMN IF NOT EXISTS used_by_campaign uuid;

ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS reserved_slot_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE TABLE IF NOT EXISTS public.advertiser_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_id uuid,
  target_type text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.advertiser_history TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advertiser_history TO authenticated;
GRANT ALL ON public.advertiser_history TO service_role;

ALTER TABLE public.advertiser_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone select history" ON public.advertiser_history FOR SELECT USING (true);
CREATE POLICY "anyone insert history" ON public.advertiser_history FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone update history" ON public.advertiser_history FOR UPDATE USING (true);
CREATE POLICY "anyone delete history" ON public.advertiser_history FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS advertiser_history_owner_idx ON public.advertiser_history (owner_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_bid_slots;