import { useAdvertiserSession } from "@/hooks/useAdvertiserSession";
import { AdvertiserAuth } from "@/components/advertiser/AdvertiserAuth";
import { AdvertiserPortalShell } from "@/components/advertiser/AdvertiserPortalShell";

export default function AdvertiserPortal() {
  const { player, loading } = useAdvertiserSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return player ? <AdvertiserPortalShell /> : <AdvertiserAuth />;
}