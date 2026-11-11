import { supabase } from "@/integrations/supabase/client";
import { getCurrentAdvertiserId, getAdvertiserScope } from "@/utils/currentAdvertiser";

export type HistoryAction =
  | "ad_created"
  | "ad_deleted"
  | "advertisement_placed"
  | "advertisement_stopped"
  | "advertisement_deleted"
  | "fund_loaded"
  | "fund_approved"
  | "bid_placed"
  | "bid_stopped"
  | "link_created"
  | "link_deleted"
  | "advertisement_updated";

export const HISTORY_LABELS: Record<HistoryAction, string> = {
  ad_created: "Ad Created",
  ad_deleted: "Ad Deleted",
  advertisement_placed: "Advertisement Placed",
  advertisement_stopped: "Advertisement Stopped",
  advertisement_deleted: "Advertisement Deleted",
  fund_loaded: "Fund Loaded",
  fund_approved: "Fund Approved",
  bid_placed: "Bid Placed",
  bid_stopped: "Bid Stopped",
  link_created: "Link Created",
  link_deleted: "Link Deleted",
  advertisement_updated: "Advertisement Updated",
};

export interface HistoryEntry {
  id: string;
  owner_id: string | null;
  action: HistoryAction;
  target_id: string | null;
  target_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Fire-and-forget write of one advertiser action to the history log.
 *  Suppressed while the admin is browsing an advertiser's data (view-only). */
export async function logAdvertiserAction(
  action: HistoryAction,
  opts?: {
    targetId?: string | null;
    targetType?: string | null;
    metadata?: Record<string, unknown>;
    /** Write into a specific advertiser's log (admin approval flows). */
    ownerId?: string | null;
  },
) {
  if (!opts?.ownerId && getAdvertiserScope()?.viewOnly) return;
  const ownerId = opts?.ownerId ?? getCurrentAdvertiserId();
  if (!ownerId) return;
  const { error } = await supabase.from("advertiser_history" as never).insert({
    owner_id: ownerId,
    action,
    target_id: opts?.targetId ?? null,
    target_type: opts?.targetType ?? null,
    metadata: opts?.metadata ?? {},
  } as never);
  if (error) console.error("history log failed", error);
}
