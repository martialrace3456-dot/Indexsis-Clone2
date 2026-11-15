import { useAdvertiserSession } from "@/hooks/useAdvertiserSession";
import { AdvertiserAuth } from "@/components/advertiser/AdvertiserAuth";
import { AdvertiserPortalShell } from "@/components/advertiser/AdvertiserPortalShell";

export default function AdvertiserPortal() {
  const { authUser, player, loading, requiresLink } = useAdvertiserSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!authUser) return <AdvertiserAuth />;

  // Do not guess/link legacy player records from usernames. A verified admin
  // linking workflow is required before this account may access legacy ad data.
  if (requiresLink || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-lg rounded-lg border bg-card p-6 space-y-3">
          <h1 className="text-xl font-semibold">Account setup is incomplete</h1>
          <p className="text-sm text-muted-foreground">
            Your Supabase Auth account is signed in, but it has not been securely linked to an advertiser profile yet. Contact the app administrator to verify and link your existing advertiser account. No legacy account data has been exposed.
          </p>
          <p className="text-sm">Signed in as {authUser.email}</p>
        </div>
      </div>
    );
  }

  return <AdvertiserPortalShell />;
}
