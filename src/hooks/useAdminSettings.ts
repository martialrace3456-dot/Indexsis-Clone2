import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_GUIDE_STEPS, parseGuideSteps, type GuideStep } from "@/utils/gameGuide";

interface SettingsMap {
  require_contest_approval: boolean;
  rounds_per_game: number;
  samples_per_round: number;
  sample_radius: number;
  min_dots: number;
  max_dots: number;
  game_guide_steps: GuideStep[];
}

const defaultSettings: SettingsMap = {
  require_contest_approval: false,
  rounds_per_game: 7,
  samples_per_round: 5,
  sample_radius: 50,
  min_dots: 25000,
  max_dots: 100000,
  game_guide_steps: DEFAULT_GUIDE_STEPS,
};

export function useAdminSettings() {
  const [settings, setSettings] = useState<SettingsMap>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap = { ...defaultSettings };
      data?.forEach((row) => {
        const key = row.key as keyof SettingsMap;
        if (key in settingsMap) {
          const val = row.value;
          if (key === "game_guide_steps") {
            settingsMap.game_guide_steps = parseGuideSteps(val);
            return;
          }
          if (typeof val === 'string') {
            if (val === 'true' || val === 'false') {
              (settingsMap as any)[key] = val === 'true';
            } else {
              const num = parseInt(val, 10);
              (settingsMap as any)[key] = isNaN(num) ? val : num;
            }
          } else if (typeof val === 'boolean') {
            (settingsMap as any)[key] = val;
          } else if (typeof val === 'number') {
            (settingsMap as any)[key] = val;
          } else {
            (settingsMap as any)[key] = val;
          }
        }
      });

      setSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching admin settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSetting = async (key: keyof SettingsMap, value: boolean | number | string | GuideStep[]) => {
    try {
      // Use upsert to handle both insert and update cases
      const { error } = await supabase
        .from('admin_settings')
        .upsert(
          { key, value: JSON.parse(JSON.stringify(value)), updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );

      if (error) throw error;

      setSettings((prev) => ({ ...prev, [key]: value }));
      window.dispatchEvent(new Event("indexsis-settings-updated"));
      return true;
    } catch (error) {
      console.error('Error updating setting:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
    window.addEventListener("indexsis-settings-updated", fetchSettings);
    const refresh = () => { if (document.visibilityState === "visible") fetchSettings(); };
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 15_000);
    return () => {
      window.removeEventListener("indexsis-settings-updated", fetchSettings);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(timer);
    };
  }, [fetchSettings]);

  return { settings, guideSteps: settings.game_guide_steps, loading, updateSetting, refetch: fetchSettings };
}
