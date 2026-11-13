import { supabase } from "@/integrations/supabase/client";

export interface SecureAdvertiserIdentity {
  id: string;
  username: string;
  email: string;
}

function toAdvertiserIdentityFromUser(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null): SecureAdvertiserIdentity | null {
  if (!user) return null;

  const username = typeof user.user_metadata?.username === "string"
    ? user.user_metadata.username
    : user.email?.split("@")[0] ?? "advertiser";

  return {
    id: user.id,
    username,
    email: user.email ?? "",
  };
}

export async function getSecureAdvertiserIdentity(): Promise<SecureAdvertiserIdentity | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error("secure advertiser auth: getSession error", error);
    return null;
  }

  return toAdvertiserIdentityFromUser(session?.user ?? null);
}

export async function signInAdvertiser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message, identity: null };
  return { error: null, identity: toAdvertiserIdentityFromUser(data.user) };
}

export async function signUpAdvertiser(input: {
  email: string;
  password: string;
  username: string;
  country?: string;
  ageGroup?: string;
}) {
  const username = input.username.trim();
  const email = input.email.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        username,
        country: input.country?.trim() ?? "",
        age_group: input.ageGroup?.trim() ?? "",
      },
    },
  });

  if (error) return { error: error.message, identity: null };

  const identity = toAdvertiserIdentityFromUser(data.user);
  return { error: null, identity };
}

export async function signOutAdvertiser() {
  const { error } = await supabase.auth.signOut();
  return { error: error ? error.message : null };
}

export async function syncAdvertiserAuthProfile() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const username = typeof user.user_metadata?.username === "string"
    ? String(user.user_metadata.username)
    : user.email?.split("@")[0] ?? "advertiser";

  try {
    await supabase
      .from("advertiser_profiles")
      .upsert({ user_id: user.id, username, player_id: null }, { onConflict: "user_id" });
  } catch {
    // The table may not exist yet in a legacy database. The app is intentionally
    // staged to a secure auth model and must not assume the old table is present.
  }

  return { id: user.id, username, email: user.email ?? "" } as SecureAdvertiserIdentity;
}
