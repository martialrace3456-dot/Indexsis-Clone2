import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CropRatio } from "@/types/admin";
import { MediaSize, normalizeCrop } from "@/utils/adCrop";

type Crop = { x: number; y: number; w: number; h: number };
type Handle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imageUrl: string;
  ratio: CropRatio;
  mediaType?: "image" | "video";
  initial?: Crop | null;
  onSave: (crop: Crop) => void;
}

const MIN = 5;

function suggested(r: CropRatio, size?: MediaSize | null): Crop {
  if (!size) return { x: 10, y: 10, w: 80, h: 80 };
  const targetRatio = r === "horizontal-half" ? 2 : r === "vertical-half" ? 0.5 : 1;
  const sourceRatio = size.width / size.height;
  const w = Math.min(80, 80 * targetRatio / sourceRatio);
  const h = Math.min(80, 80 * sourceRatio / targetRatio);
  return { x: (100 - w) / 2, y: (100 - h) / 2, w, h };
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url);
}

export function AdCropper({ open, onOpenChange, imageUrl, ratio, mediaType, initial, onSave }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState<MediaSize | null>(null);
  const [stage, setStage] = useState<MediaSize>({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);
  const [crop, setCrop] = useState<Crop>(() => initial ?? suggested(ratio));
  const drag = useRef<{ handle: Handle; startX: number; startY: number; start: Crop } | null>(null);

  useEffect(() => {
    if (open) {
      setCrop(initial ? normalizeCrop(initial) : suggested(ratio, source));
      drag.current = null;
    }
  }, [open, ratio, initial, source]);

  useEffect(() => { setSource(null); setFailed(false); }, [imageUrl]);
  useEffect(() => {
    if (!open) return;
    // The dialog mounts its content after opening.
    let observer: ResizeObserver | undefined;
    const request = requestAnimationFrame(() => {
      const element = stageRef.current;
      if (!element) return;
      const update = () => setStage({ width: element.clientWidth, height: element.clientHeight });
      update();
      observer = new ResizeObserver(update);
      observer.observe(element);
    });
    return () => { cancelAnimationFrame(request); observer?.disconnect(); };
  }, [open]);

  const isVideo = mediaType === "video" || (!mediaType && isVideoUrl(imageUrl));

  const pct = (clientX: number, clientY: number) => {
    const element = containerRef.current;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const onPointerDown = (handle: Handle) => (e: React.PointerEvent) => {
    e.stopPropagation();
    const p = pct(e.clientX, e.clientY);
    if (!p || !source) return;
    drag.current = { handle, startX: p.x, startY: p.y, start: { ...crop } };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = pct(e.clientX, e.clientY);
    if (!p) return;
    const dx = p.x - drag.current.startX;
    const dy = p.y - drag.current.startY;
    const s = drag.current.start;
    const h = drag.current.handle;
    let x = s.x, y = s.y, w = s.w, hh = s.h;

    if (h === "move") {
      x = Math.max(0, Math.min(100 - w, s.x + dx));
      y = Math.max(0, Math.min(100 - hh, s.y + dy));
    } else {
      if (h.includes("e")) w = Math.max(MIN, Math.min(100 - s.x, s.w + dx));
      if (h.includes("s")) hh = Math.max(MIN, Math.min(100 - s.y, s.h + dy));
      if (h.includes("w")) {
        const nw = Math.max(MIN, Math.min(s.w + s.x, s.w - dx));
        x = s.x + (s.w - nw);
        w = nw;
      }
      if (h.includes("n")) {
        const nh = Math.max(MIN, Math.min(s.h + s.y, s.h - dy));
        y = s.y + (s.h - nh);
        hh = nh;
      }
    }
    setCrop(normalizeCrop({ x, y, w, h: hh }));
  };

  const onPointerUp = () => { drag.current = null; };

  const handleBase = "absolute bg-primary border border-background";
  const corner = "w-3 h-3";
  const mediaWidth = source ? Math.min(stage.width, stage.height * source.width / source.height) : stage.width;
  const mediaHeight = source ? mediaWidth * source.height / source.width : stage.height;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Crop</DialogTitle>
        </DialogHeader>
        <div
          ref={stageRef}
          className="flex w-full h-[55vh] max-h-[520px] items-center justify-center bg-muted rounded overflow-hidden select-none"
        >
          <div ref={containerRef} className="relative shrink-0 overflow-hidden touch-none"
            style={{ width: mediaWidth, height: mediaHeight }}
            onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          {isVideo ? (
            <video src={imageUrl} className="absolute inset-0 w-full h-full object-contain" muted playsInline autoPlay loop
              onLoadedMetadata={(e) => setSource({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })}
              onError={() => setFailed(true)} />
          ) : (
            <img src={imageUrl} alt="crop source" draggable={false} className="absolute inset-0 w-full h-full object-contain"
              onLoad={(e) => setSource({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
              onError={() => setFailed(true)} />
          )}
          {source && !failed && <div
            onPointerDown={onPointerDown("move")}
            aria-label="Crop selection"
            className="absolute border-2 border-primary cursor-move ad-crop-selection"
            style={{
              left: `${crop.x}%`, top: `${crop.y}%`,
              width: `${crop.w}%`, height: `${crop.h}%`,
            }}
          >
            <div onPointerDown={onPointerDown("nw")} className={`${handleBase} ${corner} -top-1.5 -left-1.5 cursor-nwse-resize`} />
            <div onPointerDown={onPointerDown("ne")} className={`${handleBase} ${corner} -top-1.5 -right-1.5 cursor-nesw-resize`} />
            <div onPointerDown={onPointerDown("sw")} className={`${handleBase} ${corner} -bottom-1.5 -left-1.5 cursor-nesw-resize`} />
            <div onPointerDown={onPointerDown("se")} className={`${handleBase} ${corner} -bottom-1.5 -right-1.5 cursor-nwse-resize`} />
            <div onPointerDown={onPointerDown("n")} className={`${handleBase} h-2 -top-1 left-1/4 right-1/4 cursor-ns-resize`} />
            <div onPointerDown={onPointerDown("s")} className={`${handleBase} h-2 -bottom-1 left-1/4 right-1/4 cursor-ns-resize`} />
            <div onPointerDown={onPointerDown("w")} className={`${handleBase} w-2 -left-1 top-1/4 bottom-1/4 cursor-ew-resize`} />
            <div onPointerDown={onPointerDown("e")} className={`${handleBase} w-2 -right-1 top-1/4 bottom-1/4 cursor-ew-resize`} />
          </div>}
          {failed && <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Media unavailable</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!source || failed} onClick={() => { onSave(normalizeCrop(crop)); onOpenChange(false); }}>Save Crop</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}