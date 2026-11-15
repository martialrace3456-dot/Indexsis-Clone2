import { useAdvertiserSession } from "@/hooks/useAdvertiserSession";
import { AdvertiserAuth } from "@/components/advertiser/AdvertiserAuth";
import { AdvertiserLinkGate } from "@/components/advertiser/AdvertiserLinkGate";
import { AdvertiserPortalShell } from "@/components/advertiser/AdvertiserPortalShell";

export default function AdvertiserPortal() {
  const { authUser, player, loading, requiresLink } = useAdvertiserSession();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!authUser) return <AdvertiserAuth />;
  if (requiresLink || !player) return <AdvertiserLinkGate />;
  return <AdvertiserPortalShell />;
}
