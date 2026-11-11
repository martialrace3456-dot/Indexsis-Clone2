ALTER PUBLICATION supabase_realtime ADD TABLE public.scores,public.players,public.contests;
CREATE OR REPLACE FUNCTION public.protect_campaign_delivery_total() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF current_user IN ('anon','authenticated') AND NEW.served_seconds IS DISTINCT FROM OLD.served_seconds THEN RAISE EXCEPTION 'Campaign delivery totals can only be updated by the delivery recorder'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_campaign_delivery_total BEFORE UPDATE ON public.ad_campaigns FOR EACH ROW EXECUTE FUNCTION public.protect_campaign_delivery_total();