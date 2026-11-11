import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PlayerAccount {
  id: string;
  username: string;
  country: string | null;
  age_group: string | null;
  created_at: string;
}

export function AccountsManager() {
  const [players, setPlayers] = useState<PlayerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerAccount | null>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("players")
      .select("id, username, country, age_group, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPlayers(data as PlayerAccount[]);
    }
    setLoading(false);
  };

  const filteredPlayers = players.filter((p) =>
    p.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Accounts</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Registered Accounts ({players.length})
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            ) : filteredPlayers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No accounts found</p>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-sm font-semibold text-muted-foreground border-b border-border">
                  <div className="col-span-1">#</div>
                  <div className="col-span-4">Username</div>
                  <div className="col-span-3">Country</div>
                  <div className="col-span-4">Registered</div>
                </div>
                {filteredPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    onClick={() => setSelectedPlayer(player)}
                    className="grid grid-cols-12 gap-2 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="col-span-1 font-mono text-muted-foreground">{index + 1}</div>
                    <div className="col-span-4 font-medium text-foreground truncate">{player.username}</div>
                    <div className="col-span-3 text-muted-foreground text-sm truncate">{player.country || "—"}</div>
                    <div className="col-span-4 text-muted-foreground text-sm">
                      {new Date(player.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Player Detail Dialog */}
      <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Player Profile</DialogTitle>
          </DialogHeader>
          {selectedPlayer && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Username</p>
                <p className="font-bold text-foreground">{selectedPlayer.username}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Country</p>
                <p className="font-bold text-foreground">{selectedPlayer.country || "Not specified"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="font-bold text-foreground">{selectedPlayer.age_group || "Not specified"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Registered</p>
                <p className="font-bold text-foreground">
                  {new Date(selectedPlayer.created_at).toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">IP Address</p>
                <p className="text-sm text-muted-foreground italic">
                  IP tracking requires server-side implementation. Not yet available.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">IP-based Location</p>
                <p className="text-sm text-muted-foreground italic">
                  Geo-IP lookup requires server-side implementation. Not yet available.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
