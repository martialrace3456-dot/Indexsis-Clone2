-- Fail-closed advertiser security hardening.
--
-- This migration intentionally blocks legacy browser-only advertiser sessions.
-- It must NOT be applied to production until the app has been migrated to Supabase
-- Auth and the admin bootstrap/account-linking steps in docs/secure-advertiser-auth.md
-- have been completed and tested against a staging database.

-- Authenticated identity is linked to a legacy game player only through an
-- explicit administrator-reviewed mapping. Never infer ownership from a username.
CREATE TABLE IF NOT EXISTS public.advertiser_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  player_id uuid UNIQUE REFERENCES public.players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.advertiser_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.advertiser_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.advertiser_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.current_advertiser_player_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ap.player_id
  FROM public.advertiser_profiles AS ap
  WHERE ap.user_id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles AS ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role::text = 'admin'
  )
$$;

REVOKE ALL ON FUNCTION public.current_advertiser_player_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_advertiser_player_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

-- A new Auth account receives an unlinked profile. Linking a legacy player is a
-- separate, verified admin operation; a matching username is not proof of ownership.
CREATE OR REPLACE FUNCTION public.create_advertiser_profile_for_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_username text;
BEGIN
  v_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'username', ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'advertiser-' || left(NEW.id::text, 8)
  );

  INSERT INTO public.advertiser_profiles (user_id, username, player_id)
  VALUES (NEW.id, v_username, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public.create_advertiser_profile_for_auth_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_created_advertiser_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_advertiser_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_advertiser_profile_for_auth_user();

DROP POLICY IF EXISTS advertiser_profiles_select_own_or_admin ON public.advertiser_profiles;
CREATE POLICY advertiser_profiles_select_own_or_admin
  ON public.advertiser_profiles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.current_user_is_admin()));

-- Remove legacy/open policies on advertiser-related tables before defining a
-- strict allow-list. This prevents an old USING (true) policy from OR-ing with
-- the new owner policies.
DO $$
DECLARE
  v_table text;
  v_policy record;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'overlay_content', 'ad_campaigns', 'ad_bids', 'ad_bid_slots',
    'advertiser_load_payments', 'advertiser_balances', 'advertiser_history',
    'admin_wallet', 'user_roles'
  ] LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
      FOR v_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = v_table
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', v_policy.policyname, v_table);
      END LOOP;
    END IF;
  END LOOP;
END
$$;

-- Roles are provisioned only by a trusted administrator through the Supabase
-- dashboard/service role. Users may read their own role but cannot grant roles.
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
CREATE POLICY user_roles_select_own
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Remove browser/API write access by default from all sensitive tables.
REVOKE ALL ON public.overlay_content FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.ad_campaigns FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.ad_bids FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.ad_bid_slots FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.advertiser_load_payments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.advertiser_balances FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.advertiser_history FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.admin_wallet FROM PUBLIC, anon, authenticated;

ALTER TABLE public.overlay_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_bid_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertiser_load_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertiser_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertiser_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_wallet ENABLE ROW LEVEL SECURITY;

-- Game clients may only fetch active overlay assets. Advertisers and admins
-- may read owned/all rows respectively; writes are scoped to an authenticated
-- linked advertiser. Upload and moderation workflows will be moved to trusted
-- server functions before writes are re-enabled.
GRANT SELECT ON public.overlay_content TO anon, authenticated;
CREATE POLICY overlay_public_active_read
  ON public.overlay_content FOR SELECT TO anon
  USING (is_active = true);
CREATE POLICY overlay_owner_or_admin_read
  ON public.overlay_content FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT public.current_advertiser_player_id())
    OR (SELECT public.current_user_is_admin())
  );

-- The game only needs currently live, approved campaign data. Advertiser and
-- admin views get their own scoped rows. No direct campaign writes yet because
-- payment approval and campaign activation must be atomic server-side actions.
GRANT SELECT ON public.ad_campaigns TO anon, authenticated;
CREATE POLICY campaigns_public_live_read
  ON public.ad_campaigns FOR SELECT TO anon
  USING (status = 'live' AND payment_status = 'approved');
CREATE POLICY campaigns_owner_or_admin_read
  ON public.ad_campaigns FOR SELECT TO authenticated
  USING (
    advertiser_id = (SELECT public.current_advertiser_player_id())
    OR (SELECT public.current_user_is_admin())
  );

-- Bids, slot outcomes, balances, payment records and history are private.
-- Financial mutations are deliberately unavailable to direct client requests;
-- they must be implemented as authenticated, audited server-side operations.
GRANT SELECT ON public.ad_bids, public.ad_bid_slots TO authenticated;
CREATE POLICY bids_owner_or_admin_read
  ON public.ad_bids FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT public.current_advertiser_player_id())
    OR (SELECT public.current_user_is_admin())
  );
CREATE POLICY bid_slots_owner_or_admin_read
  ON public.ad_bid_slots FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT public.current_advertiser_player_id())
    OR (SELECT public.current_user_is_admin())
  );

GRANT SELECT ON public.advertiser_load_payments, public.advertiser_balances, public.advertiser_history TO authenticated;
CREATE POLICY payments_owner_or_admin_read
  ON public.advertiser_load_payments FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT public.current_advertiser_player_id())
    OR (SELECT public.current_user_is_admin())
  );
CREATE POLICY balances_owner_or_admin_read
  ON public.advertiser_balances FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT public.current_advertiser_player_id())
    OR (SELECT public.current_user_is_admin())
  );
CREATE POLICY history_owner_or_admin_read
  ON public.advertiser_history FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT public.current_advertiser_player_id())
    OR (SELECT public.current_user_is_admin())
  );

-- Payment destinations/configuration are hidden until the app has an explicit
-- safe read model that exposes only public payment instructions.
CREATE POLICY admin_wallet_admin_only
  ON public.admin_wallet FOR SELECT TO authenticated
  USING ((SELECT public.current_user_is_admin()));

-- Stop anonymous uploads to the overlays bucket. Public reads remain available
-- for existing game assets; owner-aware uploads need a user-scoped storage path.
DO $$
DECLARE
  v_policy record;
BEGIN
  FOR v_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        policyname ILIKE '%overlay%'
        OR COALESCE(qual, '') ILIKE '%overlays%'
        OR COALESCE(with_check, '') ILIKE '%overlays%'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', v_policy.policyname);
  END LOOP;
END
$$;
CREATE POLICY overlays_public_read_only
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'overlays');

COMMENT ON TABLE public.advertiser_profiles IS
  'Maps Supabase Auth identities to legacy game player IDs. player_id must be linked by a verified admin process; usernames alone are not proof of ownership.';
COMMENT ON FUNCTION public.current_user_is_admin() IS
  'Checks admin role for the current authenticated request. Roles must be assigned through a trusted channel, never by browser clients.';
