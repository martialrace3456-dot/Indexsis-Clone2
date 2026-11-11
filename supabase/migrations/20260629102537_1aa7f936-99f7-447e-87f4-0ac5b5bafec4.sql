
-- ============ ROLES ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users view own roles" ON public.user_roles;
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

-- ============ ADVERTISER PROFILES ============
CREATE TABLE IF NOT EXISTS public.advertiser_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.advertiser_profiles TO authenticated;
GRANT ALL ON public.advertiser_profiles TO service_role;
ALTER TABLE public.advertiser_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view own advertiser profile" ON public.advertiser_profiles;
CREATE POLICY "view own advertiser profile" ON public.advertiser_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "update own advertiser profile" ON public.advertiser_profiles;
CREATE POLICY "update own advertiser profile" ON public.advertiser_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create advertiser profile + linked player when a user signs up via the portal
CREATE OR REPLACE FUNCTION public.handle_new_advertiser()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_username text;
  v_player_id uuid;
  v_random_hash text;
BEGIN
  v_username := NULLIF(NEW.raw_user_meta_data->>'username','');
  IF v_username IS NULL THEN RETURN NEW; END IF;

  -- Link or create player record
  SELECT id INTO v_player_id FROM public.players WHERE username = v_username LIMIT 1;
  IF v_player_id IS NULL THEN
    v_random_hash := encode(gen_random_bytes(32), 'hex');
    INSERT INTO public.players (username, password_hash)
      VALUES (v_username, v_random_hash)
      RETURNING id INTO v_player_id;
  END IF;

  INSERT INTO public.advertiser_profiles (id, username, player_id)
    VALUES (NEW.id, v_username, v_player_id)
    ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_advertiser ON auth.users;
CREATE TRIGGER on_auth_user_created_advertiser
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_advertiser();

-- ============ ADD OWNER COLUMNS ============
ALTER TABLE public.overlay_content            ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.ad_bids                    ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.advertiser_load_payments   ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.advertiser_balances        ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============ POLICIES: overlay_content ============
DROP POLICY IF EXISTS "Anyone can view overlay content"   ON public.overlay_content;
DROP POLICY IF EXISTS "Anyone can insert overlay content" ON public.overlay_content;
DROP POLICY IF EXISTS "Anyone can update overlay content" ON public.overlay_content;
DROP POLICY IF EXISTS "Anyone can delete overlay content" ON public.overlay_content;

GRANT SELECT ON public.overlay_content TO anon;
CREATE POLICY "public select overlay" ON public.overlay_content FOR SELECT USING (true);
CREATE POLICY "owner insert overlay" ON public.overlay_content FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner update overlay" ON public.overlay_content FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner delete overlay" ON public.overlay_content FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ POLICIES: ad_campaigns (uses advertiser_id) ============
DROP POLICY IF EXISTS "Anyone can view ad campaigns"   ON public.ad_campaigns;
DROP POLICY IF EXISTS "Anyone can insert ad campaigns" ON public.ad_campaigns;
DROP POLICY IF EXISTS "Anyone can update ad campaigns" ON public.ad_campaigns;
DROP POLICY IF EXISTS "Anyone can delete ad campaigns" ON public.ad_campaigns;

GRANT SELECT ON public.ad_campaigns TO anon;
-- Public can read only currently live + approved (game board needs this)
CREATE POLICY "public select live ads" ON public.ad_campaigns FOR SELECT USING (status='live' AND payment_status='approved');
CREATE POLICY "owner select ads" ON public.ad_campaigns FOR SELECT TO authenticated USING (advertiser_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner insert ads" ON public.ad_campaigns FOR INSERT TO authenticated WITH CHECK (advertiser_id = auth.uid());
CREATE POLICY "owner update ads" ON public.ad_campaigns FOR UPDATE TO authenticated USING (advertiser_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner delete ads" ON public.ad_campaigns FOR DELETE TO authenticated USING (advertiser_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ POLICIES: ad_bids ============
DROP POLICY IF EXISTS "open select" ON public.ad_bids;
DROP POLICY IF EXISTS "open insert" ON public.ad_bids;
DROP POLICY IF EXISTS "open update" ON public.ad_bids;
DROP POLICY IF EXISTS "open delete" ON public.ad_bids;

CREATE POLICY "owner select bids" ON public.ad_bids FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner insert bids" ON public.ad_bids FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner update bids" ON public.ad_bids FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner delete bids" ON public.ad_bids FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ POLICIES: advertiser_load_payments ============
DROP POLICY IF EXISTS "open select" ON public.advertiser_load_payments;
DROP POLICY IF EXISTS "open insert" ON public.advertiser_load_payments;
DROP POLICY IF EXISTS "open update" ON public.advertiser_load_payments;
DROP POLICY IF EXISTS "open delete" ON public.advertiser_load_payments;

CREATE POLICY "owner select payments" ON public.advertiser_load_payments FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner insert payments" ON public.advertiser_load_payments FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "admin update payments" ON public.advertiser_load_payments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner delete payments" ON public.advertiser_load_payments FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ============ POLICIES: advertiser_balances ============
DROP POLICY IF EXISTS "Anyone can view advertiser balances"   ON public.advertiser_balances;
DROP POLICY IF EXISTS "Anyone can insert advertiser balances" ON public.advertiser_balances;
DROP POLICY IF EXISTS "Anyone can update advertiser balances" ON public.advertiser_balances;

CREATE POLICY "owner select balance" ON public.advertiser_balances FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner insert balance" ON public.advertiser_balances FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner update balance" ON public.advertiser_balances FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ POLICIES: admin_wallet (advertisers read; only admin writes) ============
DROP POLICY IF EXISTS "Anyone can view admin wallet"   ON public.admin_wallet;
DROP POLICY IF EXISTS "Anyone can insert admin wallet" ON public.admin_wallet;
DROP POLICY IF EXISTS "Anyone can update admin wallet" ON public.admin_wallet;

CREATE POLICY "auth read wallet" ON public.admin_wallet FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin insert wallet" ON public.admin_wallet FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update wallet" ON public.admin_wallet FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
