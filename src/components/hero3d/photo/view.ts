import { useRef, type RefObject } from "react";

// The virtual camera over the photo. CameraRig writes it every frame (inside
// useFrame); the photo shader and the particle layers read it. Plain numbers in
// a ref, never React state, so it costs nothing per frame.
export interface PhotoView {
  /** Parallax offset in photo-uv units (near layers shift more than far ones). */
  offsetX: number;
  offsetY: number;
  /** 1 = the whole cover-fitted photo (identical to the still poster), >1 = pushed in. */
  zoom: number;
  /** Seconds since the scene started running (the intro clock). */
  time: number;
  /** Viewport aspect (width / height). */
  aspect: number;
  /** Shared wind gust, 0…~1.2: one scalar that drives foliage, mist, rain and fireflies together. */
  gust: number;
}

export type ViewRef = RefObject<PhotoView>;

export function useView(): ViewRef {
  const ref = useRef<PhotoView | null>(null);
  if (ref.current === null) {
    ref.current = { offsetX: 0, offsetY: 0, zoom: 1, time: 0, aspect: 1.6, gust: 0.4 };
  }
  return ref as ViewRef;
}

/** Writes the camera state. Called only from useFrame; kept as a helper so the write is explicit. */
export function writeView(target: PhotoView, next: Partial<PhotoView>) {
  Object.assign(target, next);
}

// Pixel size of the source photo / depth / masks (they must all match).
export const PHOTO_SIZE = { width: 1152, height: 896 };
export const PHOTO_ASPECT = PHOTO_SIZE.width / PHOTO_SIZE.height;

/**
 * Cover-fit: how much of the photo (in uv) is visible at zoom 1 for a viewport
 * with this aspect ratio, and where to centre it. Portrait screens crop to the
 * cabins on the left rather than the middle of the photo. The still poster uses
 * the same focus (see PORTRAIT_OBJECT_POSITION), so poster and scene line up.
 */
export function coverFit(aspect: number) {
  const visibleX = aspect > PHOTO_ASPECT ? 1 : aspect / PHOTO_ASPECT;
  const visibleY = aspect > PHOTO_ASPECT ? PHOTO_ASPECT / aspect : 1;
  const focusX = aspect >= 1 ? 0.5 : 0.36;
  const focusY = aspect >= 1 ? 0.5 : 0.52;
  return { visibleX, visibleY, focusX, focusY };
}

export const PORTRAIT_OBJECT_POSITION = "36% 52%";

function unit(n: number) {
  const s = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * One smooth "wind" value in 0…~1.2: a slow swell, plus a gust every ~11 s that
 * builds and fades over a few seconds. Deterministic in time (no Math.random).
 */
export function gustAt(t: number): number {
  const swell = 0.5 + 0.5 * Math.sin(t * 0.37) * Math.sin(t * 0.11 + 1.3);
  const period = 11;
  const k = Math.floor(t / period);
  const local = t - k * period;
  const start = unit(k + 17) * (period - 5);
  const x = (local - start) / 3.6;
  const burst = x > 0 && x < 1 ? Math.sin(Math.PI * x) ** 2 : 0;
  const strength = 0.45 + 0.55 * unit(k);
  return Math.min(1.2, 0.22 + 0.42 * swell + 0.6 * strength * burst);
}
