import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_GUIDE_STEPS, GUIDE_STORAGE_KEY, markGuideSeen, parseGuideSteps, shouldAutoShowGuide } from "./gameGuide";
test("first play opens guide and finishing or skipping prevents automatic reopening", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  assert.equal(shouldAutoShowGuide(storage), true);
  markGuideSeen(storage);
  assert.equal(values.get(GUIDE_STORAGE_KEY), "seen");
  assert.equal(shouldAutoShowGuide(storage), false);
});
test("guide retains exactly six editable steps and falls back for invalid saved data", () => {
  const edited = DEFAULT_GUIDE_STEPS.map((step, i) => ({ ...step, title: `Custom ${i}` }));
  assert.deepEqual(parseGuideSteps(edited), edited);
  assert.equal(parseGuideSteps([]), DEFAULT_GUIDE_STEPS);
  assert.equal(parseGuideSteps([{ title: "", description: "" }]), DEFAULT_GUIDE_STEPS);
});