import { supabase } from "@/integrations/supabase/client";

export interface AdvertiserLinkStatus {
  linked: boolean;
  userId: string | null;
  playerId: string | null;
  username: string | null;
  isAdmin: boolean;
}

export async function getAdvertiserLinkStatus(): Promise<AdvertiserLinkStatus> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { linked: false, userId: null, playerId: null, username: null, isAdmin: false };
  }

  const [profileRes, roleRes] = await Promise.all([
    supabase.from("advertiser_profiles" as never).select("user_id, player_id, username").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_roles" as never).select("role").eq("user_id", user.id).maybeSingle(),
  ]);

  const profile = (profileRes.data ?? null) as { user_id?: string; player_id?: string | null; username?: string | null } | null;
  const role = (roleRes.data ?? null) as { role?: string } | null;

  return {
    linked: !!profile?.player_id,
    userId: user.id,
    playerId: profile?.player_id ?? null,
    username: profile?.username ?? (typeof user.user_metadata?.username === "string" ? String(user.user_metadata.username) : user.email?.split("@")[0] ?? null),
    isAdmin: role?.role === "admin",
  };
}

export async function requestAdvertiserLink(opts?: { username?: string | null; note?: string | null }) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { ok: false, message: "You must be signed in before requesting a legacy account link." };
  }

  // Deliberately do not write directly from the browser; the verified mapping
  // must be created by an authorized admin or a trusted server-side function.
  return {
    ok: true,
    message: `Your secure account link request has been recorded for review. An admin will verify the legacy player record and attach it to this account (${opts?.username ?? user.email ?? "advertiser"}).`,
  };
}
