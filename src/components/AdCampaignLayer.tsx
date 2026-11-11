import { useCallback, useEffect, useRef, useState } from "react";
import { LiveAdCampaign } from "@/hooks/useActiveAdCampaigns";
import { AdPlacement } from "@/types/admin";
import { CroppedAdMedia } from "./CroppedAdMedia";

function placementRect(p: AdPlacement): { x: number; y: number; w: number; h: number } {
  switch (p) {
    case "whole-board": return { x: 0, y: 0, w: 100, h: 100 };
    case "top-row": return { x: 0, y: 0, w: 100, h: 50 };
    case "bottom-row": return { x: 0, y: 50, w: 100, h: 50 };
    case "left-column": return { x: 0, y: 0, w: 50, h: 100 };
    case "right-column": return { x: 50, y: 0, w: 50, h: 100 };
    case "top-left": return { x: 0, y: 0, w: 50, h: 50 };
    case "top-right": return { x: 50, y: 0, w: 50, h: 50 };
    case "bottom-left": return { x: 0, y: 50, w: 50, h: 50 };
    case "bottom-right": return { x: 50, y: 50, w: 50, h: 50 };
    default: return { x: 0, y: 0, w: 100, h: 100 };
  }
}

function AdItem({ c, muted, onVisibility }: { c: LiveAdCampaign; muted: boolean; onVisibility?: (id: string, visible: boolean) => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = frame.current; if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.5), { threshold: [0, 0.5, 1] });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => { onVisibility?.(c.id, ready && inView); return () => onVisibility?.(c.id, false); }, [c.id, ready, inView, onVisibility]);
  const rect = placementRect(c.placement);

  return (
    <div
      ref={frame}
      className="absolute overflow-hidden"
      style={{
        left: `${rect.x}%`,
        top: `${rect.y}%`,
        width: `${rect.w}%`,
        height: `${rect.h}%`,
      }}
    >
      <CroppedAdMedia url={c.overlay.url} mediaType={c.overlay.content_type}
        crop={c.crop_data} alt={c.title || "Ad"} muted={muted} onReadyChange={setReady} />
    </div>
  );
}

interface Props {
  visible: boolean;
  campaigns?: LiveAdCampaign[];
  muted?: boolean;
  onVisibleCampaigns?: (ids: string[]) => void;
}

export function AdCampaignLayer({ visible, campaigns = [], muted = true, onVisibleCampaigns }: Props) {
  const seen = useRef(new Set<string>());
  const onVisibility = useCallback((id: string, shown: boolean) => {
    if (shown) seen.current.add(id); else seen.current.delete(id);
    onVisibleCampaigns?.([...seen.current].sort());
  }, [onVisibleCampaigns]);
  if (!visible || campaigns.length === 0) return null;
  return (
    <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden">
      {campaigns.map((c) => (
        <AdItem key={c.id} c={c} muted={muted} onVisibility={onVisibility} />
      ))}
    </div>
  );
}