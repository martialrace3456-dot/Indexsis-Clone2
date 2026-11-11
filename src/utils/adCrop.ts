export type MediaCrop = { x: number; y: number; w: number; h: number };
export type MediaSize = { width: number; height: number };

export function normalizeCrop(crop?: MediaCrop | null): MediaCrop {
  if (!crop) return { x: 0, y: 0, w: 100, h: 100 };
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const w = clamp(Number.isFinite(crop.w) ? crop.w : 100, 0.1, 100);
  const h = clamp(Number.isFinite(crop.h) ? crop.h : 100, 0.1, 100);
  return {
    x: clamp(Number.isFinite(crop.x) ? crop.x : 0, 0, 100 - w),
    y: clamp(Number.isFinite(crop.y) ? crop.y : 0, 0, 100 - h), w, h,
  };
}

export function fitMediaCrop(source: MediaSize, target: MediaSize, selection?: MediaCrop | null) {
  const crop = normalizeCrop(selection);
  const cropWidth = source.width * crop.w / 100;
  const cropHeight = source.height * crop.h / 100;
  const scale = Math.max(target.width / cropWidth, target.height / cropHeight);
  return {
    width: source.width * scale,
    height: source.height * scale,
    left: (target.width - cropWidth * scale) / 2 - source.width * crop.x / 100 * scale,
    top: (target.height - cropHeight * scale) / 2 - source.height * crop.y / 100 * scale,
  };
}