ALTER TABLE public.ad_campaigns ADD COLUMN served_seconds double precision NOT NULL DEFAULT 0;
ALTER TABLE public.scores ADD COLUMN analytics_match_id uuid;
CREATE TABLE public.gameplay_intervals (
 id uuid PRIMARY KEY, match_id uuid NOT NULL, player_key text NOT NULL, player_id uuid, contest_id uuid, country text, age_group text,
 started_at timestamptz NOT NULL, ended_at timestamptz NOT NULL, seconds double precision NOT NULL, round_number integer NOT NULL,
 round_completed boolean NOT NULL DEFAULT false,
 CONSTRAINT gameplay_interval_bounds CHECK (seconds >= 0 AND seconds <= 15 AND ended_at >= started_at AND round_number BETWEEN 1 AND 7)
);
GRANT SELECT ON public.gameplay_intervals TO anon, authenticated;
GRANT ALL ON public.gameplay_intervals TO service_role;
ALTER TABLE public.gameplay_intervals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read public gameplay statistics" ON public.gameplay_intervals FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX gameplay_intervals_range ON public.gameplay_intervals (ended_at);
CREATE INDEX gameplay_intervals_match ON public.gameplay_intervals (match_id);
CREATE TABLE public.ad_exposure_intervals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), interval_id uuid NOT NULL REFERENCES public.gameplay_intervals(id) ON DELETE CASCADE,
 campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
 started_at timestamptz NOT NULL, ended_at timestamptz NOT NULL, seconds double precision NOT NULL CHECK(seconds > 0),
 UNIQUE(interval_id,campaign_id)
);
GRANT SELECT ON public.ad_exposure_intervals TO anon, authenticated;
GRANT ALL ON public.ad_exposure_intervals TO service_role;
ALTER TABLE public.ad_exposure_intervals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read public ad exposure statistics" ON public.ad_exposure_intervals FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX ad_exposure_campaign_range ON public.ad_exposure_intervals(campaign_id,ended_at);
CREATE OR REPLACE FUNCTION public.record_gameplay_interval(p_id uuid, p_match_id uuid, p_player_key text, p_player_id uuid, p_contest_id uuid, p_started_at timestamptz, p_ended_at timestamptz, p_round integer, p_round_completed boolean, p_campaign_ids uuid[] DEFAULT '{}') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_country text; v_age text; v_seconds double precision; v_campaign public.ad_campaigns%ROWTYPE; v_start timestamptz; v_end timestamptz; v_served double precision;
BEGIN
 IF p_started_at > p_ended_at OR p_ended_at > clock_timestamp() + interval '10 seconds' OR p_started_at < clock_timestamp() - interval '5 minutes' OR p_round NOT BETWEEN 1 AND 7 OR length(p_player_key) > 100 THEN RAISE EXCEPTION 'Invalid gameplay interval'; END IF;
 IF p_contest_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.contests WHERE id=p_contest_id) THEN RAISE EXCEPTION 'Unknown contest'; END IF;
 SELECT country,age_group INTO v_country,v_age FROM public.players WHERE id=p_player_id;
 v_seconds := LEAST(15,GREATEST(0,EXTRACT(EPOCH FROM p_ended_at-p_started_at)));
 INSERT INTO public.gameplay_intervals(id,match_id,player_key,player_id,contest_id,country,age_group,started_at,ended_at,seconds,round_number,round_completed)
 VALUES(p_id,p_match_id,p_player_key,p_player_id,p_contest_id,v_country,v_age,p_started_at,p_ended_at,v_seconds,p_round,p_round_completed)
 ON CONFLICT(id) DO NOTHING;
 IF NOT FOUND THEN RETURN; END IF;
 FOR v_campaign IN SELECT * FROM public.ad_campaigns WHERE id=ANY(p_campaign_ids) ORDER BY id FOR UPDATE LOOP
  IF v_campaign.status <> 'live' OR v_campaign.payment_status <> 'approved' THEN CONTINUE; END IF;
  IF cardinality(v_campaign.country_targets)>0 AND NOT (COALESCE(v_country,'')=ANY(v_campaign.country_targets)) THEN CONTINUE; END IF;
  IF cardinality(v_campaign.contest_targets)>0 AND NOT (COALESCE(p_contest_id::text,'global')=ANY(v_campaign.contest_targets)) THEN CONTINUE; END IF;
  IF v_campaign.age_target <> 'all' AND NOT (CASE v_campaign.age_target WHEN 'above_12' THEN COALESCE(v_age,'') IN ('above_12','above_16','above_18') WHEN 'above_16' THEN COALESCE(v_age,'') IN ('above_16','above_18') WHEN 'above_18' THEN COALESCE(v_age,'')='above_18' ELSE false END) THEN CONTINUE; END IF;
  v_start := GREATEST(p_started_at,COALESCE(v_campaign.starts_at,p_started_at));
  v_end := LEAST(p_ended_at,COALESCE(v_campaign.ends_at,p_ended_at));
  IF v_campaign.payment_method='reserved_time' AND cardinality(v_campaign.reserved_slot_ids)>0 THEN
   SELECT COALESCE(SUM(EXTRACT(EPOCH FROM LEAST(v_end,slot_end)-GREATEST(v_start,slot_start))),0) INTO v_served FROM public.ad_bid_slots WHERE id=ANY(v_campaign.reserved_slot_ids) AND slot_start<v_end AND slot_end>v_start;
  ELSE v_served := GREATEST(0,EXTRACT(EPOCH FROM v_end-v_start)); END IF;
  v_served := LEAST(v_seconds,v_served,GREATEST(0,v_campaign.runtime_minutes*60-v_campaign.served_seconds));
  IF v_served > 0 THEN
   INSERT INTO public.ad_exposure_intervals(interval_id,campaign_id,started_at,ended_at,seconds) VALUES(p_id,v_campaign.id,v_start,LEAST(v_end,v_start+v_served*interval '1 second'),v_served);
   UPDATE public.ad_campaigns SET served_seconds=served_seconds+v_served, status=CASE WHEN served_seconds+v_served >= runtime_minutes*60 THEN 'expired' ELSE status END WHERE id=v_campaign.id;
  END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.record_gameplay_interval(uuid,uuid,text,uuid,uuid,timestamptz,timestamptz,integer,boolean,uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_gameplay_interval(uuid,uuid,text,uuid,uuid,timestamptz,timestamptz,integer,boolean,uuid[]) TO anon,authenticated,service_role;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gameplay_intervals,public.ad_exposure_intervals;