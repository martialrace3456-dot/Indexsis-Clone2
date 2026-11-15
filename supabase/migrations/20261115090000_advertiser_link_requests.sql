-- Verified advertiser account-link requests. No client can create or mutate a
-- profile mapping directly; only the admin-only approval RPC writes player_id.
CREATE TABLE IF NOT EXISTS public.advertiser_link_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_username text NOT NULL CHECK (length(trim(requested_username)) BETWEEN 3 AND 80),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id),
  CHECK (
    (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS advertiser_link_requests_one_pending_per_user
  ON public.advertiser_link_requests (user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS advertiser_link_requests_review_queue
  ON public.advertiser_link_requests (created_at) WHERE status = 'pending';

ALTER TABLE public.advertiser_link_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.advertiser_link_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.advertiser_link_requests TO authenticated;

DROP POLICY IF EXISTS advertiser_link_requests_select_self_or_admin ON public.advertiser_link_requests;
CREATE POLICY advertiser_link_requests_select_self_or_admin
  ON public.advertiser_link_requests FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.current_user_is_admin()));

DROP POLICY IF EXISTS advertiser_link_requests_insert_self ON public.advertiser_link_requests;
CREATE POLICY advertiser_link_requests_insert_self
  ON public.advertiser_link_requests FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

CREATE OR REPLACE FUNCTION public.review_advertiser_link_request(
  _request_id uuid,
  _decision text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.advertiser_link_requests%ROWTYPE;
  v_player_id uuid;
  v_player_username text;
  v_match_count integer;
  v_existing_profile public.advertiser_profiles%ROWTYPE;
BEGIN
  IF NOT (SELECT public.current_user_is_admin()) THEN
    RAISE EXCEPTION 'administrator access required' USING ERRCODE = '42501';
  END IF;
  IF _decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'decision must be approve or reject' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_request
  FROM public.advertiser_link_requests
  WHERE id = _request_id
  FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'pending link request not found';
  END IF;

  IF _decision = 'approve' THEN
    SELECT count(*), min(p.id), min(p.username)
    INTO v_match_count, v_player_id, v_player_username
    FROM public.players AS p
    WHERE lower(p.username) = lower(trim(v_request.requested_username));

    IF v_match_count <> 1 THEN
      RAISE EXCEPTION 'requested username must match exactly one legacy player';
    END IF;

    SELECT * INTO v_existing_profile
    FROM public.advertiser_profiles
    WHERE user_id = v_request.user_id
    FOR UPDATE;
    IF FOUND AND v_existing_profile.player_id IS NOT NULL AND v_existing_profile.player_id <> v_player_id THEN
      RAISE EXCEPTION 'auth account is already linked to a different legacy player';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.advertiser_profiles
      WHERE player_id = v_player_id AND user_id <> v_request.user_id
    ) THEN
      RAISE EXCEPTION 'legacy player is already linked to another auth account';
    END IF;

    INSERT INTO public.advertiser_profiles (user_id, username, player_id)
    VALUES (v_request.user_id, v_player_username, v_player_id)
    ON CONFLICT (user_id) DO UPDATE
      SET username = EXCLUDED.username,
          player_id = EXCLUDED.player_id,
          updated_at = now();

    UPDATE public.advertiser_link_requests
    SET status = 'approved', reviewed_by = (SELECT auth.uid()), reviewed_at = now()
    WHERE id = _request_id;
  ELSE
    UPDATE public.advertiser_link_requests
    SET status = 'rejected', reviewed_by = (SELECT auth.uid()), reviewed_at = now()
    WHERE id = _request_id;
  END IF;
END
$$;

REVOKE ALL ON FUNCTION public.review_advertiser_link_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_advertiser_link_request(uuid, text) TO authenticated;
COMMENT ON FUNCTION public.review_advertiser_link_request(uuid, text) IS
  'Admin-only atomic review of advertiser legacy-account links. Approval requires one exact case-insensitive username match and enforces one-to-one profile linking.';
