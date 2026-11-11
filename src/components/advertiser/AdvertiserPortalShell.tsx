import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, Wallet, History, ChevronDown, User, LogOut } from "lucide-react";
import { useAdvertiserSession } from "@/hooks/useAdvertiserSession";
import { useAdvertiserBalance } from "@/hooks/useAdvertiserBalance";
import { OverlayManager } from "@/components/admin/OverlayManager";
import { ProfileDialog } from "./ProfileDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AdvertiserNavProvider, PortalTab } from "@/contexts/AdvertiserNav";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NAV: { id: PortalTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "finance", label: "Finance", icon: Wallet },
  { id: "history", label: "History", icon: History },
];

export function AdvertiserPortalShell() {
  const { player, logout } = useAdvertiserSession();
  const { loadAmount, heldAmount, available } = useAdvertiserBalance();
  const [tab, setTab] = useState<PortalTab>("home");
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <AdvertiserNavProvider tab={tab} setTab={setTab}>
      <div className="min-h-screen flex bg-background">
        <aside className="w-56 border-r flex flex-col shrink-0">
          <div className="px-4 py-4 border-b">
            <h1 className="text-lg font-bold text-primary tracking-tight">Indexsis</h1>
            <p className="text-[10px] text-muted-foreground">Advertiser</p>
          </div>

          <nav className="flex-1 p-2 space-y-1">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = tab === n.id;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setTab(n.id)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors",
                    active ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t space-y-2">
            <div className="rounded-md border bg-muted/40 p-3 space-y-1">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Available</div>
              <div className="text-lg font-semibold">${available.toFixed(2)}</div>
              <div className="text-[11px] text-muted-foreground">On hold ${heldAmount.toFixed(2)}</div>
              <div className="text-[11px] text-muted-foreground">Total loaded ${loadAmount.toFixed(2)}</div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-2">
                  <span className="truncate">{player?.username}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-48">
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <User className="h-4 w-4 mr-2" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { logout(); toast.success("Signed out"); }}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto p-6">
          <OverlayManager activeTab={tab} hideHeader hideTabsBar />
        </main>

        {player && (
          <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} playerId={player.id} />
        )}
      </div>
    </AdvertiserNavProvider>
  );
}
