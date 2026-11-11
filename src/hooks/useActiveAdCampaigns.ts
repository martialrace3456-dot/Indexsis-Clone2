import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdCampaign, OverlayContent } from "@/types/admin";
import { allocatePlacements, campaignMatchesAudience, type AdAudience } from "@/utils/adDelivery";
export type LiveAdCampaign = AdCampaign & { overlay: OverlayContent };
export function useActiveAdCampaigns(audience?: AdAudience) {
  const [campaigns,setCampaigns]=useState<LiveAdCampaign[]>([]);
  const fetchActive=useCallback(async()=>{
    const {data:camps,error}=await supabase.from("ad_campaigns").select("*").eq("status","live").eq("payment_status","approved");
    if(error){console.error("Active campaigns fetch failed",error);return;}
    const now=Date.now();
    const list=(camps??[]) as unknown as AdCampaign[];
    const eligible=list.filter((c)=>(!c.starts_at || Date.parse(c.starts_at)<=now) && (!c.ends_at || Date.parse(c.ends_at)>now) && (c.served_seconds??0)<c.runtime_minutes*60 && campaignMatchesAudience(c,audience ?? { country: null, ageGroup: null, contestId: null }));
    const slotIds=eligible.flatMap((c)=>c.payment_method==="reserved_time" ? c.reserved_slot_ids??[]:[]);
    const slots=slotIds.length ? await supabase.from("ad_bid_slots").select("id,slot_start,slot_end").in("id",slotIds):{data:[]};
    const available=new Set((slots.data??[]).filter((s)=>Date.parse(s.slot_start)<=now && Date.parse(s.slot_end)>now).map((s)=>s.id));
    const inWindow=allocatePlacements(eligible.filter((c)=>c.payment_method!=="reserved_time" || !c.reserved_slot_ids?.length || c.reserved_slot_ids.some((id)=>available.has(id))));
    if(!inWindow.length){setCampaigns([]);return;}
    const {data:overlays}=await supabase.from("overlay_content").select("*").in("id",[...new Set(inWindow.map((c)=>c.overlay_id))]);
    const map=new Map((overlays??[]).map((o)=>[o.id,o as unknown as OverlayContent]));
    setCampaigns(inWindow.flatMap((c)=>{const overlay=map.get(c.overlay_id);return overlay?[{...c,overlay}]:[];}));
  },[audience?.country,audience?.ageGroup,audience?.contestId]);
  useEffect(()=>{
    void fetchActive();const interval=setInterval(()=>void fetchActive(),1000);
    const channel=supabase.channel(`live-ads-${crypto.randomUUID()}`);
    for(const table of ["ad_campaigns","overlay_content","ad_bid_slots"]) channel.on("postgres_changes",{event:"*",schema:"public",table},()=>void fetchActive());
    channel.subscribe();return ()=>{clearInterval(interval);void supabase.removeChannel(channel);};
  },[fetchActive]);
  return {campaigns: campaigns.filter((c) => campaignMatchesAudience(c, audience ?? { country: null, ageGroup: null, contestId: null })),refetch:fetchActive};
}
