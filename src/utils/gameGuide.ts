export interface GuideStep { title: string; description: string }
export const GUIDE_STORAGE_KEY = "indexsis_game_guide_seen_v1";
export const GUIDE_TARGETS = ["board", "board", "samples", "guess", "history", "round"] as const;
export const DEFAULT_GUIDE_STEPS: GuideStep[] = [
  { title: "Estimate the board density", description: "Your goal is to estimate the average dot density across the whole board—not the total number of dots. Density is measured in dots per square pixel (dots/px²)." },
  { title: "Take a sample", description: "Click or tap the board to place a sampling circle. Its density is the number of dots inside the circle divided by its area: π × radius². Radius is measured in pixels, so area is in square pixels (px²) and density is in dots/px²." },
  { title: "Compare five samples", description: "Take 5 samples in different parts of the board. Compare their density values (dots/px²) to form an estimate of the average density of the whole board." },
  { title: "Enter your density estimate", description: "After all 5 samples, enter your estimated average board density in dots/px² and select Submit Guess. Enter a density value, not a dot count." },
  { title: "Review your score", description: "Your guess is compared with the actual average board density. A closer estimate earns a higher score, up to 10 points per round. Review the result, then select Next round." },
  { title: "Complete all 7 rounds", description: "Complete all 7 rounds to get your final score out of 70.0, view your performance certificate, and see how you compare in the Global Stats ranking." },
];
export function parseGuideSteps(value: unknown): GuideStep[] {
  if (!Array.isArray(value) || value.length !== 6 || !value.every((step) => step && typeof step.title === "string" && step.title.trim() && typeof step.description === "string" && step.description.trim())) return DEFAULT_GUIDE_STEPS;
  return value.map((step) => ({ title: step.title, description: step.description }));
}
export function shouldAutoShowGuide(storage: Pick<Storage, "getItem">): boolean {
  try { return storage.getItem(GUIDE_STORAGE_KEY) !== "seen"; } catch { return true; }
}
export function markGuideSeen(storage: Pick<Storage, "setItem">): void {
  try { storage.setItem(GUIDE_STORAGE_KEY, "seen"); } catch { /* Private browsing may disable storage. */ }
}