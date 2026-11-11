-- 1. Administrator advertiser account
INSERT INTO public.players (username, password_hash)
SELECT 'Administrator', 'd7300c4fd899601dd6164c6980d225a4ae0e4d4dacd805b817b8766d20ed919a'
WHERE NOT EXISTS (SELECT 1 FROM public.players WHERE username = 'Administrator');

-- 2. Back-fill legacy owner-less advertising data onto that account
UPDATE public.overlay_content SET owner_id = (SELECT id FROM public.players WHERE username = 'Administrator') WHERE owner_id IS NULL;
UPDATE public.ad_campaigns SET advertiser_id = (SELECT id FROM public.players WHERE username = 'Administrator') WHERE advertiser_id IS NULL;
UPDATE public.ad_bids SET owner_id = (SELECT id FROM public.players WHERE username = 'Administrator') WHERE owner_id IS NULL;
UPDATE public.advertiser_load_payments SET owner_id = (SELECT id FROM public.players WHERE username = 'Administrator') WHERE owner_id IS NULL;
UPDATE public.advertiser_balances SET owner_id = (SELECT id FROM public.players WHERE username = 'Administrator') WHERE owner_id IS NULL;

-- 3. Per-slot auction layer
CREATE TABLE public.ad_bid_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL REFERENCES public.ad_bids(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES public.players(id),
  slot_start timestamp with time zone NOT NULL,
  slot_end timestamp with time zone NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  state text NOT NULL DEFAULT 'contested',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX ad_bid_slots_bid_idx ON public.ad_bid_slots(bid_id);
CREATE INDEX ad_bid_slots_start_idx ON public.ad_bid_slots(slot_start);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_bid_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_bid_slots TO authenticated;
GRANT ALL ON public.ad_bid_slots TO service_role;

ALTER TABLE public.ad_bid_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone select bid slots" ON public.ad_bid_slots FOR SELECT USING (true);
CREATE POLICY "anyone insert bid slots" ON public.ad_bid_slots FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone update bid slots" ON public.ad_bid_slots FOR UPDATE USING (true);
CREATE POLICY "anyone delete bid slots" ON public.ad_bid_slots FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_ad_bid_slots_updated_at
BEFORE UPDATE ON public.ad_bid_slots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();