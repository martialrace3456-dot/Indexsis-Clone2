import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search, Users, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdvertiserViewProvider } from "@/contexts/AdvertiserView";
import { AdvertiserNavProvider, PortalTab } from "@/contexts/AdvertiserNav";
import { OverlayManager } from "./OverlayManager";

interface AdvertiserRow {
  id: string;
  username: string;
  balance: number;
  ads: number;
  liveCampaigns: number;
  bids: number;
  lastActivity: string | null;
}

interface OwnerRef { owner_id?: string | null; advertiser_id?: string | null }
interface CreatedRow extends OwnerRef { created_at: string }
interface StatusRow extends OwnerRef { status: string; created_at: string }
interface BalanceRow extends OwnerRef { load_amount: number | string }

export function AdvertisersManager() {
  const [rows, setRows] = useState<AdvertiserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdvertiserRow | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [pl, ov, cp, bd, bal, pay] = await Promise.all([
        supabase.from("players").select("id, username"),
        supabase.from("overlay_content").select("owner_id, created_at"),
        supabase.from("ad_campaigns").select("advertiser_id, status, created_at"),
        supabase.from("ad_bids").select("owner_id, created_at"),
        supabase.from("advertiser_balances").select("owner_id, load_amount"),
        supabase.from("advertiser_load_payments").select("owner_id, created_at"),
      ]);

      const byOwner = new Map<string, AdvertiserRow>();
      const ensure = (id: string | null | undefined, username?: string): AdvertiserRow | null => {
        if (!id) return null;
        let r = byOwner.get(id);
        if (!r) {
          r = { id, username: username ?? "", balance: 0, ads: 0, liveCampaigns: 0, bids: 0, lastActivity: null };
          byOwner.set(id, r);
        }
        if (username) r.username = username;
        return r;
      };
      const touch = (r: AdvertiserRow, at?: string | null) => {
        if (at && (!r.lastActivity || new Date(at) > new Date(r.lastActivity))) r.lastActivity = at;
      };

      ((pl.data ?? []) as unknown as { id: string; username: string }[]).forEach((p) => ensure(p.id, p.username));
      ((ov.data ?? []) as unknown as CreatedRow[]).forEach((o) => {
        const r = ensure(o.owner_id);
        if (r) { r.ads += 1; touch(r, o.created_at); }
      });
      ((cp.data ?? []) as unknown as StatusRow[]).forEach((c) => {
        const r = ensure(c.advertiser_id);
        if (r) { if (c.status === "live") r.liveCampaigns += 1; touch(r, c.created_at); }
      });
      ((bd.data ?? []) as unknown as CreatedRow[]).forEach((b) => {
        const r = ensure(b.owner_id);
        if (r) { r.bids += 1; touch(r, b.created_at); }
      });
      ((bal.data ?? []) as unknown as BalanceRow[]).forEach((x) => {
        const r = ensure(x.owner_id);
        if (r) r.balance = Number(x.load_amount ?? 0);
      });
      ((pay.data ?? []) as unknown as CreatedRow[]).forEach((p) => {
        const r = ensure(p.owner_id);
        if (r) touch(r, p.created_at);
      });

      const list = Array.from(byOwner.values()).filter((r) => r.lastActivity || r.balance > 0);
      list.sort((a, b) => {
        const ta = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const tb = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return tb - ta;
      });
      setRows(list);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    r.username.toLowerCase().includes(search.toLowerCase()),
  );

  if (selected) {
    return <AdvertiserDetailView advertiser={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Advertisers</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Advertiser Accounts ({rows.length})
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No advertiser accounts found</p>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-sm font-semibold text-muted-foreground border-b border-border">
                  <div className="col-span-4">Username</div>
                  <div className="col-span-2">Balance</div>
                  <div className="col-span-2">Ads</div>
                  <div className="col-span-2">Live Campaigns</div>
                  <div className="col-span-2">Bids</div>
                </div>
                {filtered.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="grid grid-cols-12 gap-2 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="col-span-4 font-medium text-foreground truncate">{r.username}</div>
                    <div className="col-span-2 text-sm">${r.balance.toFixed(2)}</div>
                    <div className="col-span-2 text-sm text-muted-foreground">{r.ads}</div>
                    <div className="col-span-2 text-sm text-muted-foreground">{r.liveCampaigns}</div>
                    <div className="col-span-2 text-sm text-muted-foreground">{r.bids}</div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function AdvertiserDetailView({
  advertiser,
  onBack,
}: {
  advertiser: AdvertiserRow;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<PortalTab>("home");

  return (
    <AdvertiserViewProvider ownerId={advertiser.id} username={advertiser.username}>
      <AdvertiserNavProvider tab={tab} setTab={setTab}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <p className="text-sm font-semibold">Viewing {advertiser.username}</p>
              <p className="text-xs text-muted-foreground">
                Read-only advertiser view — actions are disabled
              </p>
            </div>
          </div>
          <OverlayManager activeTab={tab} hideHeader />
        </div>
      </AdvertiserNavProvider>
    </AdvertiserViewProvider>
  );
}
