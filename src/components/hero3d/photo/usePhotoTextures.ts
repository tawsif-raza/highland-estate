"use client";

import { useEffect, useState } from "react";
import {
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from "three";

export interface PhotoTextures {
  photo: Texture;
  /** Original depth map (white = near): used for atmosphere, fog and haze. */
  depth: Texture;
  /** Dilated + smoothed depth for the single forward parallax lookup (no tearing). */
  depthFwd: Texture;
  /** R = old binary sky mask (superseded by `sky`), G = light emitters (windows, lamps), B = foliage that sways. */
  masks: Texture;
  /** R = wet stone path. */
  masks2: Texture;
  /** R = soft sky matte: the TRUE fractional sky coverage, including gaps in the canopy. */
  sky: Texture;
  /** RGB = the emitter mask pre-blurred at three radii (tight / medium / wide), half-res. */
  glow: Texture;
}

const URLS = {
  photo: "/images/hero-exterior.png",
  depth: "/images/hero-depth.png",
  depthFwd: "/images/hero-depth-dilated.png",
  masks: "/images/hero-masks.png",
  masks2: "/images/hero-masks2.png",
  sky: "/images/hero-sky.png",
  glow: "/images/hero-glow.png",
} as const;

/**
 * Loads the photo and its helper maps. Returns null until all are ready (the
 * poster <img> stays visible meanwhile). Data textures are uploaded as non-colour
 * data so the shader reads exact mask/depth values.
 */
export function usePhotoTextures(): PhotoTextures | null {
  const [textures, setTextures] = useState<PhotoTextures | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: Texture[] = [];
    const loader = new TextureLoader();

    Promise.all([
      loader.loadAsync(URLS.photo),
      loader.loadAsync(URLS.depth),
      loader.loadAsync(URLS.depthFwd),
      loader.loadAsync(URLS.masks),
      loader.loadAsync(URLS.masks2),
      loader.loadAsync(URLS.sky),
      loader.loadAsync(URLS.glow),
    ])
      .then(([photo, depth, depthFwd, masks, masks2, sky, glow]) => {
        loaded = [photo, depth, depthFwd, masks, masks2, sky, glow];
        if (cancelled) {
          loaded.forEach((texture) => texture.dispose());
          return;
        }
        photo.colorSpace = SRGBColorSpace;
        photo.minFilter = LinearMipmapLinearFilter;
        photo.generateMipmaps = true;

        for (const data of [depth, depthFwd, glow]) {
          data.colorSpace = NoColorSpace;
          data.minFilter = LinearFilter;
          data.generateMipmaps = false;
        }
        // The masks keep mipmaps: a coarse level is a free, smooth blur (used for rims).
        for (const mask of [masks, masks2, sky]) {
          mask.colorSpace = NoColorSpace;
          mask.minFilter = LinearMipmapLinearFilter;
          mask.generateMipmaps = true;
        }
        for (const texture of loaded) {
          texture.magFilter = LinearFilter;
          texture.wrapS = ClampToEdgeWrapping;
          texture.wrapT = ClampToEdgeWrapping;
          texture.needsUpdate = true;
        }
        setTextures({ photo, depth, depthFwd, masks, masks2, sky, glow });
      })
      .catch(() => {
        // Missing asset: stay on the poster photo rather than show a broken scene.
      });

    return () => {
      cancelled = true;
      loaded.forEach((texture) => texture.dispose());
    };
  }, []);

  return textures;
}
