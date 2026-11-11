
ALTER TABLE public.overlay_content ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  overlay_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  placement text NOT NULL DEFAULT 'whole-board',
  crop_ratio text NOT NULL DEFAULT 'full-square',
  crop_data jsonb,
  age_target text NOT NULL DEFAULT 'all',
  country_targets text[] NOT NULL DEFAULT '{}',
  contest_targets uuid[] NOT NULL DEFAULT '{}',
  runtime_minutes integer NOT NULL DEFAULT 60,
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'pending_payment',
  payment_method text,
  crypto_currency text,
  from_address text,
  amount numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  advertiser_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ad campaigns" ON public.ad_campaigns FOR SELECT USING (true);
CREATE POLICY "Anyone can insert ad campaigns" ON public.ad_campaigns FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update ad campaigns" ON public.ad_campaigns FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete ad campaigns" ON public.ad_campaigns FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.admin_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addresses jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_wallet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view admin wallet" ON public.admin_wallet FOR SELECT USING (true);
CREATE POLICY "Anyone can insert admin wallet" ON public.admin_wallet FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update admin wallet" ON public.admin_wallet FOR UPDATE USING (true);

INSERT INTO public.admin_wallet (addresses) VALUES ('{"paypal":"admin@example.com","skrill":"admin@example.com","volet":"admin-volet","paypeer":"admin-paypeer","crypto_btc":"bc1qadminbtcaddress","crypto_eth":"0xAdminEthAddress","crypto_usdt":"TAdminUsdtAddress","crypto_usdc":"0xAdminUsdcAddress","crypto_sol":"AdminSolAddress"}'::jsonb)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.advertiser_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid,
  identifier text NOT NULL DEFAULT 'admin',
  load_amount numeric NOT NULL DEFAULT 0,
  reserved_minutes integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.advertiser_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view advertiser balances" ON public.advertiser_balances FOR SELECT USING (true);
CREATE POLICY "Anyone can insert advertiser balances" ON public.advertiser_balances FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update advertiser balances" ON public.advertiser_balances FOR UPDATE USING (true);

INSERT INTO public.advertiser_balances (identifier, load_amount, reserved_minutes) VALUES ('admin', 500, 1200)
ON CONFLICT DO NOTHING;
