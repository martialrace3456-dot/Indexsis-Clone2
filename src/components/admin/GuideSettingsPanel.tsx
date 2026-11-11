import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { DEFAULT_GUIDE_STEPS, type GuideStep } from "@/utils/gameGuide";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

export function GuideSettingsPanel() {
  const { guideSteps, updateSetting } = useAdminSettings();
  const [draft, setDraft] = useState<GuideStep[]>(guideSteps);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const processing = useRef(false);
  useEffect(() => { if (!dirty) setDraft(guideSteps); }, [guideSteps, dirty]);
  const edit = (index: number, key: keyof GuideStep, value: string) => {
    setDirty(true);
    setDraft((prev) => prev.map((step, i) => i === index ? { ...step, [key]: value } : step));
  };
  const save = async (steps: GuideStep[]) => {
    if (processing.current) return;
    if (steps.some((step) => !step.title.trim() || !step.description.trim())) { toast.error("Each step needs a title and description"); return; }
    processing.current = true; setSaving(true);
    try {
      const ok = await updateSetting("game_guide_steps", steps);
      if (!ok) { toast.error("Failed to save guide"); return; }
      setDraft(steps); setDirty(false); toast.success("Guide saved");
    } finally { processing.current = false; setSaving(false); }
  };
  return <section className="space-y-4 border-t pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-bold">Guide Settings</h2>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={saving} onClick={() => save(DEFAULT_GUIDE_STEPS)}><RotateCcw className="h-4 w-4 mr-2" />Reset to Defaults</Button>
        <Button disabled={!dirty || saving} onClick={() => save(draft)}><Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save Guide Changes"}</Button>
      </div>
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      {draft.map((step, index) => <div key={index} className="border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-data-primary">Step {index + 1}</h3>
        <div className="space-y-1"><Label htmlFor={`guide-title-${index}`}>Title</Label><Input id={`guide-title-${index}`} value={step.title} onChange={(e) => edit(index, "title", e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor={`guide-description-${index}`}>Description</Label><Textarea id={`guide-description-${index}`} rows={5} value={step.description} onChange={(e) => edit(index, "description", e.target.value)} /></div>
      </div>)}
    </div>
  </section>;
}