import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { updatePlayerProfile } from "@/utils/playerAuth";
import { toast } from "sonner";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { CertificateActions } from "@/components/CertificateActions";
import { fetchGlobalScores } from "@/utils/statsQueries";
import { performanceRank } from "@/utils/performanceStats";

interface PlayerProfileProps {
  playerId: string;
  playerName: string;
  onNameChange: (newName: string) => void;
}

interface ScoreEntry {
  id: string;
  total_score: number;
  game_date: string;
  contest_name: string | null;
  contest_id: string | null;
  global_rank: number;
}

type SortKey = "date" | "score" | "rank";

const HISTORY_GRID = "grid grid-cols-[20px,minmax(64px,auto),minmax(0,1fr),minmax(48px,auto),minmax(40px,auto),64px] gap-1.5 sm:gap-3 px-1 sm:px-2";

export function PlayerProfile({ playerId, playerName, onNameChange }: PlayerProfileProps) {
  const [username, setUsername] = useState(playerName);
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [email, setEmail] = useState("");
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [gameHistory, setGameHistory] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });

  useEffect(() => {
    fetchProfileData();
  }, [playerName]);

  const fetchProfileData = async () => {
    setLoading(true);

    // Fetch player country
    const { data: playerData } = await supabase
      .from("players")
      .select("country, age_group, email")
      .eq("id", playerId)
      .single();
    if (playerData) {
      setCountry((playerData as any).country || "");
      setAgeGroup((playerData as any).age_group || "");
      setEmail((playerData as any).email || "");
    }

    try {
      const allScores = await fetchGlobalScores();
      const own = allScores.filter((sc) => sc.player_name === playerName);
      const best = own.reduce((m, sc) => Math.max(m, Number(sc.total_score)), -Infinity);
      setGlobalRank(own.length ? performanceRank(best, allScores) : null);
      setGameHistory(own.map((sc) => ({
        id: sc.id,
        total_score: Number(sc.total_score),
        game_date: sc.game_date,
        contest_name: sc.contest_name,
        contest_id: sc.contest_id,
        global_rank: performanceRank(Number(sc.total_score), allScores, sc.created_at),
      })));
    } catch {
      toast.error("Game history could not be loaded");
    }

    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const updates: { username?: string; password?: string; country?: string; ageGroup?: string; email?: string } = {};

    if (username.trim() !== playerName) {
      if (!username.trim()) {
        toast.error("Username cannot be empty");
        setSaving(false);
        return;
      }
      updates.username = username.trim();
    }

    if (password.trim()) {
      if (password.length < 4) {
        toast.error("Password must be at least 4 characters");
        setSaving(false);
        return;
      }
      updates.password = password;
    }

    // Always include country and age in updates for editing
    updates.country = country.trim();
    updates.ageGroup = ageGroup.trim();
    updates.email = email.trim();

    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      setSaving(false);
      return;
    }

    const success = await updatePlayerProfile(playerId, updates);

    if (success) {
      // Update scores with new username if changed
      if (updates.username) {
        await supabase
          .from("scores")
          .update({ player_name: updates.username })
          .eq("player_name", playerName);
        
        await supabase
          .from("contest_scores")
          .update({ player_name: updates.username })
          .eq("player_name", playerName);

        onNameChange(updates.username);
      }
      setPassword("");
      toast.success("Profile updated successfully!");
      fetchProfileData();
    } else {
      toast.error("Failed to update profile. Username may be taken.");
    }

    setSaving(false);
  };

  const toggleSort = (key: SortKey) =>
    setSort((cur) => (cur.key === key ? { key, dir: cur.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  const sortedHistory = [...gameHistory].sort((a, b) => {
    const v = sort.key === "date"
      ? new Date(a.game_date).getTime() - new Date(b.game_date).getTime()
      : sort.key === "score" ? a.total_score - b.total_score : a.global_rank - b.global_rank;
    return sort.dir === "asc" ? v : -v;
  });

  const SortHeader = ({ label, k, center }: { label: string; k: SortKey; center?: boolean }) => {
    const Icon = sort.key !== k ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <button type="button" onClick={() => toggleSort(k)} className={`flex items-center gap-1 hover:text-foreground ${center ? "justify-center" : ""} ${sort.key === k ? "text-foreground" : ""}`}>
        {label}<Icon className="h-3 w-3 shrink-0" />
      </button>
    );
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Profile Info */}
      <Card className="bg-card/50 border-primary/50">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">New Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Country <span className="text-muted-foreground text-xs">(optional)</span></label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. United States"
              maxLength={50}
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Age <span className="text-muted-foreground text-xs">(optional)</span></label>
            <Input
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              placeholder="e.g. 25"
              maxLength={10}
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email <span className="text-muted-foreground text-xs">(optional)</span></label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              maxLength={100}
              className="bg-input border-border"
            />
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Global Ranking</p>
            <p className="text-2xl font-bold font-mono text-foreground">
              {loading ? "..." : globalRank ? `#${globalRank}` : "Unranked"}
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-accent hover:opacity-90 text-primary-foreground font-semibold"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Game History */}
      <Card className="bg-card/50 border-primary/50">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">Game History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            <div className={`${HISTORY_GRID} py-2 text-[10px] sm:text-sm font-semibold text-muted-foreground border-b border-border`}>
              <div>#</div>
              <SortHeader label="Date" k="date" />
              <div>Contest</div>
              <SortHeader label="Global Rank" k="rank" center />
              <SortHeader label="Score" k="score" center />
              <div className="text-center">Certificate</div>
            </div>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : sortedHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No games played yet</div>
            ) : (
              sortedHistory.map((entry, index) => (
                <div key={entry.id} className={`${HISTORY_GRID} py-2 items-center rounded-lg hover:bg-muted/50 transition-colors text-xs sm:text-sm`}>
                  <div className="font-mono text-muted-foreground">{index + 1}</div>
                  <div className="text-muted-foreground whitespace-nowrap">{new Date(entry.game_date).toLocaleDateString()}</div>
                  <div className="text-muted-foreground truncate" title={entry.contest_name || "Global"}>{entry.contest_name || "Global"}</div>
                  <div className="text-center font-mono text-foreground">#{entry.global_rank}</div>
                  <div className="text-center font-mono text-foreground">{entry.total_score.toFixed(2)}</div>
                  <CertificateActions playerName={playerName} score={entry.total_score} contestId={entry.contest_id} contestName={entry.contest_name} worldRank={entry.global_rank} />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
