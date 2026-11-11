
-- Add optional email to players
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS email text;

-- Drop trigger function (no longer linked to auth)
DROP FUNCTION IF EXISTS public.handle_new_advertiser() CASCADE;

-- Drop advertiser_profiles (no longer used)
DROP TABLE IF EXISTS public.advertiser_profiles CASCADE;

-- Repoint owner FK columns from auth.users to players(id)
ALTER TABLE public.overlay_content DROP CONSTRAINT IF EXISTS overlay_content_owner_id_fkey;
ALTER TABLE public.overlay_content ADD CONSTRAINT overlay_content_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.players(id) ON DELETE SET NULL;

ALTER TABLE public.ad_bids DROP CONSTRAINT IF EXISTS ad_bids_owner_id_fkey;
ALTER TABLE public.ad_bids ADD CONSTRAINT ad_bids_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.players(id) ON DELETE SET NULL;

ALTER TABLE public.advertiser_load_payments DROP CONSTRAINT IF EXISTS advertiser_load_payments_owner_id_fkey;
ALTER TABLE public.advertiser_load_payments ADD CONSTRAINT advertiser_load_payments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.players(id) ON DELETE SET NULL;

ALTER TABLE public.advertiser_balances DROP CONSTRAINT IF EXISTS advertiser_balances_owner_id_fkey;
ALTER TABLE public.advertiser_balances ADD CONSTRAINT advertiser_balances_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.players(id) ON DELETE SET NULL;

-- Replace auth.uid()-based policies with permissive policies; ownership enforced client-side (matches existing players/scores pattern)

-- overlay_content
DROP POLICY IF EXISTS "owner delete overlay" ON public.overlay_content;
DROP POLICY IF EXISTS "owner insert overlay" ON public.overlay_content;
DROP POLICY IF EXISTS "owner update overlay" ON public.overlay_content;
DROP POLICY IF EXISTS "public select overlay" ON public.overlay_content;
CREATE POLICY "anyone select overlay" ON public.overlay_content FOR SELECT USING (true);
CREATE POLICY "anyone insert overlay" ON public.overlay_content FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone update overlay" ON public.overlay_content FOR UPDATE USING (true);
CREATE POLICY "anyone delete overlay" ON public.overlay_content FOR DELETE USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.overlay_content TO anon, authenticated;

-- ad_campaigns
DROP POLICY IF EXISTS "owner delete ads" ON public.ad_campaigns;
DROP POLICY IF EXISTS "owner insert ads" ON public.ad_campaigns;
DROP POLICY IF EXISTS "owner update ads" ON public.ad_campaigns;
DROP POLICY IF EXISTS "owner select ads" ON public.ad_campaigns;
DROP POLICY IF EXISTS "public select live ads" ON public.ad_campaigns;
CREATE POLICY "anyone select ads" ON public.ad_campaigns FOR SELECT USING (true);
CREATE POLICY "anyone insert ads" ON public.ad_campaigns FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone update ads" ON public.ad_campaigns FOR UPDATE USING (true);
CREATE POLICY "anyone delete ads" ON public.ad_campaigns FOR DELETE USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_campaigns TO anon, authenticated;

-- Drop FK on ad_campaigns.advertiser_id if any & repoint to players
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='public.ad_campaigns'::regclass AND contype='f' AND conname LIKE '%advertiser%' LOOP
    EXECUTE 'ALTER TABLE public.ad_campaigns DROP CONSTRAINT '||quote_ident(r.conname);
  END LOOP;
END $$;
ALTER TABLE public.ad_campaigns ADD CONSTRAINT ad_campaigns_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.players(id) ON DELETE SET NULL;

-- ad_bids
DROP POLICY IF EXISTS "owner delete bids" ON public.ad_bids;
DROP POLICY IF EXISTS "owner insert bids" ON public.ad_bids;
DROP POLICY IF EXISTS "owner update bids" ON public.ad_bids;
DROP POLICY IF EXISTS "owner select bids" ON public.ad_bids;
CREATE POLICY "anyone select bids" ON public.ad_bids FOR SELECT USING (true);
CREATE POLICY "anyone insert bids" ON public.ad_bids FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone update bids" ON public.ad_bids FOR UPDATE USING (true);
CREATE POLICY "anyone delete bids" ON public.ad_bids FOR DELETE USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_bids TO anon, authenticated;

-- advertiser_load_payments
DROP POLICY IF EXISTS "owner delete payments" ON public.advertiser_load_payments;
DROP POLICY IF EXISTS "owner insert payments" ON public.advertiser_load_payments;
DROP POLICY IF EXISTS "owner update payments" ON public.advertiser_load_payments;
DROP POLICY IF EXISTS "owner select payments" ON public.advertiser_load_payments;
DROP POLICY IF EXISTS "admin update payments" ON public.advertiser_load_payments;
CREATE POLICY "anyone select payments" ON public.advertiser_load_payments FOR SELECT USING (true);
CREATE POLICY "anyone insert payments" ON public.advertiser_load_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone update payments" ON public.advertiser_load_payments FOR UPDATE USING (true);
CREATE POLICY "anyone delete payments" ON public.advertiser_load_payments FOR DELETE USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advertiser_load_payments TO anon, authenticated;

-- advertiser_balances
DROP POLICY IF EXISTS "owner select balance" ON public.advertiser_balances;
DROP POLICY IF EXISTS "owner insert balance" ON public.advertiser_balances;
DROP POLICY IF EXISTS "owner update balance" ON public.advertiser_balances;
CREATE POLICY "anyone select balance" ON public.advertiser_balances FOR SELECT USING (true);
CREATE POLICY "anyone insert balance" ON public.advertiser_balances FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone update balance" ON public.advertiser_balances FOR UPDATE USING (true);
CREATE POLICY "anyone delete balance" ON public.advertiser_balances FOR DELETE USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advertiser_balances TO anon, authenticated;
