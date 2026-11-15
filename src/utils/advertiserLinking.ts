import { supabase } from "@/integrations/supabase/client";

export interface AdvertiserLinkStatus {
  linked: boolean;
  userId: string | null;
  playerId: string | null;
  username: string | null;
  isAdmin: boolean;
  requestStatus: "pending" | "approved" | "rejected" | null;
}

export async function getAdvertiserLinkStatus(): Promise<AdvertiserLinkStatus> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { linked: false, userId: null, playerId: null, username: null, isAdmin: false, requestStatus: null };
  }

  const [profileRes, roleRes, requestRes] = await Promise.all([
    supabase.from("advertiser_profiles" as never).select("player_id, username").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_roles" as never).select("role").eq("user_id", user.id).maybeSingle(),
    supabase.from("advertiser_link_requests" as never).select("status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const profile = (profileRes.data ?? null) as { player_id?: string | null; username?: string | null } | null;
  const role = (roleRes.data ?? null) as { role?: string } | null;
  const request = (requestRes.data ?? null) as { status?: "pending" | "approved" | "rejected" } | null;

  return {
    linked: !!profile?.player_id,
    userId: user.id,
    playerId: profile?.player_id ?? null,
    username: profile?.username ?? (typeof user.user_metadata?.username === "string" ? String(user.user_metadata.username) : user.email?.split("@")[0] ?? null),
    isAdmin: role?.role === "admin",
    requestStatus: request?.status ?? null,
  };
}

export async function requestAdvertiserLink(input: { username: string; note?: string }) {
  const username = input.username.trim();
  if (username.length < 3 || username.length > 80) return { ok: false, message: "Enter a legacy username between 3 and 80 characters." };
  if ((input.note?.length ?? 0) > 1000) return { ok: false, message: "The note must be 1,000 characters or fewer." };

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, message: "Sign in before requesting account verification." };

  const { error } = await supabase.from("advertiser_link_requests" as never).insert({
    user_id: user.id,
    requested_username: username,
    note: input.note?.trim() ?? "",
  } as never);

  if (error) {
    if (error.code === "23505") return { ok: false, message: "You already have a pending verification request." };
    console.error("Unable to submit advertiser link request", error);
    return { ok: false, message: "The verification request could not be submitted. Please try again later." };
  }
  return { ok: true, message: "Verification request submitted for administrator review." };
}

export async function reviewAdvertiserLinkRequest(requestId: string, decision: "approve" | "reject", verificationEvidence?: string) {
  if (decision === "approve" && (verificationEvidence?.trim().length ?? 0) < 10) {
    return { ok: false, message: "Record how ownership was verified (at least 10 characters) before approving." };
  }
  const { error } = await supabase.rpc("review_advertiser_link_request" as never, {
    _request_id: requestId,
    _decision: decision,
    _verification_evidence: verificationEvidence?.trim() || null,
  } as never);
  if (error) {
    console.error("Unable to review advertiser link request", error);
    return { ok: false, message: error.message };
  }
  return { ok: true, message: decision === "approve" ? "Account link approved." : "Request rejected." };
}
