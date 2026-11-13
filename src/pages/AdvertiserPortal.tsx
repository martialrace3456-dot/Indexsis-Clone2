import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdvertiserAuth } from "@/components/advertiser/AdvertiserAuth";
import { AdvertiserPortalShell } from "@/components/advertiser/AdvertiserPortalShell";

export default function AdvertiserPortal() {
  const [sessionUser, setSessionUser] = useState<{ id: string; email?: string | null; username?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) {
        console.error("advertiser portal session error", error);
        setSessionUser(null);
        setLoading(false);
        return;
      }

      setSessionUser(session?.user ?? null);
      setLoading(false);
    }

    hydrate();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSessionUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return sessionUser ? <AdvertiserPortalShell /> : <AdvertiserAuth />;
}
