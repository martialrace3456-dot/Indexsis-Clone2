import type { AdCampaign, AdPlacement } from "@/types/admin";
export interface AdAudience { country: string | null; ageGroup: string | null; contestId: string | null }
export function campaignMatchesAudience(campaign: AdCampaign, audience: AdAudience) {
  const ages: Record<string, number> = { above_12:12, above_16:16, above_18:18 };
  return (!campaign.country_targets.length || campaign.country_targets.includes(audience.country ?? ""))
    && (!campaign.contest_targets.length || campaign.contest_targets.includes(audience.contestId ?? "global"))
    && (campaign.age_target === "all" || (ages[audience.ageGroup ?? ""] ?? 0) >= (ages[campaign.age_target] ?? Infinity));
}
const cells: Record<AdPlacement, number[]> = { "whole-board":[0,1,2,3],"top-row":[0,1],"bottom-row":[2,3],"left-column":[0,2],"right-column":[1,3],"top-left":[0],"top-right":[1],"bottom-left":[2],"bottom-right":[3] };
// Only non-overlapping placements run together; covered media must not consume runtime.
export function allocatePlacements<T extends AdCampaign>(campaigns: T[]): T[] {
  const occupied = new Set<number>();
  return [...campaigns].sort((a,b)=>a.created_at.localeCompare(b.created_at)).filter((campaign)=>{
    const required=cells[campaign.placement];
    if(required.some((cell)=>occupied.has(cell))) return false;
    required.forEach((cell)=>occupied.add(cell));return true;
  });
}