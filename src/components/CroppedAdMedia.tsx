import { useEffect, useRef, useState } from "react";
import { fitMediaCrop, MediaCrop, MediaSize } from "@/utils/adCrop";

interface Props {
  url: string;
  mediaType: "image" | "video";
  crop?: MediaCrop | null;
  alt?: string;
  muted?: boolean;
  onReadyChange?: (ready: boolean) => void;
}

/** Shared by the specification preview and live board: one uniform pixel scale. */
export function CroppedAdMedia({ url, mediaType, crop, alt = "Ad", muted = true, onReadyChange }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState<MediaSize | null>(null);
  const [target, setTarget] = useState<MediaSize>({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { onReadyChange?.(Boolean(source) && !failed && (mediaType === "image" || playing)); return () => onReadyChange?.(false); }, [source, failed, mediaType, playing, onReadyChange]);
  useEffect(() => { setSource(null); setFailed(false); }, [url, mediaType]);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const update = () => setTarget({ width: element.clientWidth, height: element.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.muted = muted;
    if (!muted) void element.play().catch(() => {});
  }, [muted]);
  const geometry = source && target.width > 0 && target.height > 0
    ? fitMediaCrop(source, target, crop) : null;
  const style: React.CSSProperties = geometry
    ? { position: "absolute", ...geometry, maxWidth: "none", visibility: "visible" }
    : { position: "absolute", visibility: "hidden" };
  return (
    <div ref={frame} className="absolute inset-0 overflow-hidden">
      {mediaType === "image" ? (
        <img src={url} alt={alt} draggable={false} style={style}
          onLoad={(e) => setSource({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
          onError={() => setFailed(true)} />
      ) : (
        <video ref={video} src={url} style={style} autoPlay muted={muted} loop playsInline
          onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} onWaiting={() => setPlaying(false)}
          onLoadedMetadata={(e) => setSource({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })}
          onError={() => setFailed(true)} />
      )}
      {failed && <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Media unavailable</span>}
    </div>
  );
}