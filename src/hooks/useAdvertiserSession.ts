import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setAuthenticatedAdvertiserId } from "@/utils/currentAdvertiser";

type AuthUser = {
  id: string;
  email?: string | null;
  created_at?: string;
  user_metadata?: Record<string, unknown>;
};

export interface AdvertiserPlayer {
  id: string;
  username: string;
}

export function useAdvertiserSession() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [player, setPlayer] = useState<AdvertiserPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresLink, setRequiresLink] = useState(false);

  useEffect(() => {
    let mounted = true;
    let request = 0;

    const loadProfile = async (user: AuthUser | null) => {
      const currentRequest = ++request;
      if (!user) {
        setAuthUser(null);
        setPlayer(null);
        setRequiresLink(false);
        setAuthenticatedAdvertiserId(null);
        if (mounted) setLoading(false);
        return;
      }

      setAuthUser(user);
      setLoading(true);
      const { data, error } = await supabase
        .from("advertiser_profiles" as never)
        .select("player_id, username")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mounted || currentRequest !== request) return;

      if (error) {
        // Missing profile/schema or database failure must fail closed.
        console.error("Unable to load advertiser profile", error);
        setPlayer(null);
        setRequiresLink(true);
        setAuthenticatedAdvertiserId(null);
      } else {
        const profile = data as unknown as { player_id: string | null; username: string } | null;
        if (profile?.player_id) {
          const nextPlayer = { id: profile.player_id, username: profile.username };
          setPlayer(nextPlayer);
          setRequiresLink(false);
          setAuthenticatedAdvertiserId(profile.player_id);
        } else {
          setPlayer(null);
          setRequiresLink(true);
          setAuthenticatedAdvertiserId(null);
        }
      }
      setLoading(false);
    };

    const hydrate = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) console.error("Unable to restore advertiser auth session", error);
      await loadProfile((data.session?.user as AuthUser | undefined) ?? null);
    };

    void hydrate();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer database work until after the auth callback returns.
      queueMicrotask(() => void loadProfile((session?.user as AuthUser | undefined) ?? null));
    });

    return () => {
      mounted = false;
      request += 1;
      listener.subscription.unsubscribe();
      setAuthenticatedAdvertiserId(null);
    };
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return { error: error.message };
    setAuthenticatedAdvertiserId(null);
    return { error: null };
  }, []);

  return { authUser, player, loading, requiresLink, logout };
}
