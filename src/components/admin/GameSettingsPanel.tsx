import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { GuideSettingsPanel } from "./GuideSettingsPanel";

const SETTINGS_CONFIG = [
  {
    key: "rounds_per_game" as const,
    label: "Rounds Per Game",
    description: "Number of rounds in each game session",
    min: 1,
    max: 20,
    default: 7,
  },
  {
    key: "samples_per_round" as const,
    label: "Samples Per Round",
    description: "Maximum number of samples a player can take per round",
    min: 1,
    max: 20,
    default: 5,
  },
  {
    key: "sample_radius" as const,
    label: "Sample Radius",
    description: "Radius of the sample circle in pixels",
    min: 10,
    max: 200,
    default: 50,
  },
  {
    key: "min_dots" as const,
    label: "Minimum Dots",
    description: "Minimum number of dots on the game board",
    min: 1000,
    max: 100000,
    default: 25000,
  },
  {
    key: "max_dots" as const,
    label: "Maximum Dots",
    description: "Maximum number of dots on the game board",
    min: 10000,
    max: 500000,
    default: 100000,
  },
];

export function GameSettingsPanel() {
  const { settings, loading, updateSetting } = useAdminSettings();
  const [localSettings, setLocalSettings] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const getValue = (key: string) => {
    if (key in localSettings) return localSettings[key];
    return settings[key as keyof typeof settings] as number;
  };

  const handleChange = (key: string, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setLocalSettings((prev) => ({ ...prev, [key]: num }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(localSettings)) {
        const config = SETTINGS_CONFIG.find((c) => c.key === key);
        if (config) {
          const clampedValue = Math.max(config.min, Math.min(config.max, value));
          await updateSetting(key as keyof typeof settings, clampedValue);
        }
      }
      setLocalSettings({});
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLocalSettings({});
    toast.info("Changes discarded");
  };

  const hasChanges = Object.keys(localSettings).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Game Settings</h2>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Discard
            </Button>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SETTINGS_CONFIG.map((config) => (
          <Card key={config.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{config.label}</CardTitle>
              <CardDescription className="text-sm">{config.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={config.min}
                  max={config.max}
                  value={getValue(config.key)}
                  onChange={(e) => handleChange(config.key, e.target.value)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  Range: {config.min.toLocaleString()} - {config.max.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Default: {config.default.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Note</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Changes to game settings will apply to new games only. Games in progress will continue
            with their original settings. The game uses these values dynamically, so changes take
            effect immediately for new sessions.
          </p>
        </CardContent>
      </Card>
      <GuideSettingsPanel />
    </div>
  );
}
