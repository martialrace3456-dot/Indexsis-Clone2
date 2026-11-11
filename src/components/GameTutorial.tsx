import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { GUIDE_TARGETS, type GuideStep } from "@/utils/gameGuide";

interface Props { steps: GuideStep[]; onClose: () => void }
export function GameTutorial({ steps, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ x: 12, y: 12, width: 340, rect: null as DOMRect | null });
  const step = steps[index];
  useEffect(() => {
    const target = [...document.querySelectorAll<HTMLElement>(`[data-guide="${GUIDE_TARGETS[index]}"]`)].find((el) => el.getBoundingClientRect().width > 0);
    target?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [index]);
  useLayoutEffect(() => {
    const update = () => {
      const candidates = [...document.querySelectorAll<HTMLElement>(`[data-guide="${GUIDE_TARGETS[index]}"]`)];
      const target = candidates.find((el) => el.getBoundingClientRect().width > 0);
      const rect = target?.getBoundingClientRect() ?? null;
      const width = Math.min(360, window.innerWidth - 24);
      const height = panel.current?.offsetHeight ?? 280;
      const maxY = Math.max(12, window.innerHeight - height - 12);
      let x = Math.max(12, Math.min((rect?.left ?? 12), window.innerWidth - width - 12));
      let y = maxY;
      if (rect && rect.right + width + 24 <= window.innerWidth) { x = rect.right + 12; y = Math.min(maxY, Math.max(12, rect.top)); }
      else if (rect && rect.bottom + height + 24 <= window.innerHeight) y = rect.bottom + 12;
      else if (rect && rect.top >= height + 24) y = rect.top - height - 12;
      setLayout({ x, y, width, rect });
    };
    update();
    const observer = new ResizeObserver(update);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [index]);
  if (!step) return null;
  return createPortal(<>
    {layout.rect && <div aria-hidden="true" className="guide-spotlight fixed pointer-events-none z-[60] rounded-lg border-2 border-data-primary" style={{ left: layout.rect.left - 4, top: layout.rect.top - 4, width: layout.rect.width + 8, height: layout.rect.height + 8 }} />}
    <div ref={panel} role="dialog" aria-modal="false" aria-labelledby="guide-title" aria-describedby="guide-description" className="fixed z-[61] border border-data-primary bg-popover text-popover-foreground rounded-lg p-4 shadow-lg max-h-[calc(100dvh-24px)] overflow-y-auto" style={{ left: layout.x, top: layout.y, width: layout.width }}>
      <div className="flex justify-between items-center mb-3 gap-3">
        <span className="text-xs font-medium text-data-primary">How to play · {index + 1} of {steps.length}</span>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-7 px-2 text-xs text-muted-foreground">Skip Tutorial</Button>
      </div>
      <h2 id="guide-title" className="text-lg font-semibold mb-2 break-words">{step.title}</h2>
      <p id="guide-description" className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">{step.description}</p>
      <div className="flex items-center justify-between gap-3 mt-4">
        <Button size="sm" variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <Button size="sm" onClick={() => index === steps.length - 1 ? onClose() : setIndex((i) => i + 1)}>{index === steps.length - 1 ? "Finish" : "Next"}<ArrowRight className="h-4 w-4 ml-1" /></Button>
      </div>
    </div>
  </>, document.body);
}