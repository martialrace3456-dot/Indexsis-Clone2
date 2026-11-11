import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AdAudience } from "@/utils/adDelivery";
interface Props { active: boolean; playerId: string | null; playerKey: string; contestId: string | null; round: number; completedRounds: number }
export function useGameplayTracking({active,playerId,playerKey,contestId,round,completedRounds}:Props) {
  const [matchId,setMatchId]=useState(()=>crypto.randomUUID());
  const [audience,setAudience]=useState<AdAudience>({country:null,ageGroup:null,contestId});
  const visibleAds=useRef<string[]>([]);
  const elapsed=useRef(0);
  const flushRef=useRef<()=>void>(()=>{});
  const lastCompleted=useRef(0);
  useEffect(()=>{
    let cancelled=false;
    setAudience({country:null,ageGroup:null,contestId});
    if(playerId) void supabase.from("players").select("country,age_group").eq("id",playerId).maybeSingle().then(({data})=>{if(!cancelled) setAudience({country:data?.country??null,ageGroup:data?.age_group??null,contestId});});
    return ()=>{cancelled=true;};
  },[playerId,contestId]);
  const send=useCallback((start:number,end:number,completed:boolean,ads:string[])=>{
    const args={p_id:crypto.randomUUID(),p_match_id:matchId,p_player_key:playerKey,p_player_id:playerId,p_contest_id:contestId,p_started_at:new Date(start).toISOString(),p_ended_at:new Date(end).toISOString(),p_round:round,p_round_completed:completed,p_campaign_ids:ads};
    const write=async()=>{
      const {error}=await supabase.rpc("record_gameplay_interval",args);
      if(error) { const retry=await supabase.rpc("record_gameplay_interval",args); if(retry.error) console.error("Gameplay tracking failed",retry.error); }
    };
    void write();
  },[matchId,playerKey,playerId,contestId,round]);
  useEffect(()=>{
    let start=Date.now(), monotonic=performance.now();
    let playing=active && !document.hidden;
    let currentAds=[...visibleAds.current];
    const flush=()=>{
      const end=Date.now(), now=performance.now();
      if(playing){
        const seconds=Math.min(15,Math.max(0,(now-monotonic)/1000));
        elapsed.current+=seconds;
        if(seconds>0.01) send(Math.max(start,end-seconds*1000),end,false,currentAds);
      }
      start=end;monotonic=now;currentAds=[...visibleAds.current];
    };
    flushRef.current=flush;
    const visibility=()=>{flush();playing=active && !document.hidden;};
    const timer=setInterval(flush,5000);
    document.addEventListener("visibilitychange",visibility);
    window.addEventListener("pagehide",flush);
    return ()=>{flush();clearInterval(timer);document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pagehide",flush);flushRef.current=()=>{};};
  },[active,send]);
  useEffect(()=>{
    if(completedRounds>lastCompleted.current){const now=Date.now();send(now,now,true,[]);}
    lastCompleted.current=completedRounds;
  },[completedRounds,send]);
  const onVisibleCampaigns=useCallback((ids:string[])=>{
    if(ids.join(",")===visibleAds.current.join(",")) return;
    flushRef.current();visibleAds.current=ids;
    // Flush again so the next interval uses the new visibility list from this exact boundary.
    flushRef.current();
  },[]);
  const reset=()=>{flushRef.current();elapsed.current=0;lastCompleted.current=0;setMatchId(crypto.randomUUID());};
  const durationSeconds=()=>{flushRef.current();return Math.round(elapsed.current);};
  return {matchId,audience,onVisibleCampaigns,reset,durationSeconds};
}