export interface PanoramaAsset {
  id: string;
  title: string;
  subtitle: string;
  thumbnail: string;
  badge?: string;
  roomSlug?: string;
  /**
   * Primary equirectangular panorama path (minimum recommended: 4096 × 2048 px, 2:1 aspect ratio).
   */
  panorama: string;
  /**
   * Optional fast low-resolution preview for progressive loading (recommended: 1024 × 512 px, ~80–150 KB).
   * Loaded first for instant interactive display before the full-resolution asset completes.
   */
  preview?: string;
  /**
   * Optional ultra-high-resolution 8K equirectangular panorama (8192 × 4096 px).
   * Loaded dynamically on desktop clients whose GPU MAX_TEXTURE_SIZE >= 8192.
   */
  ultraPanorama?: string;
}

export const TOUR_SPOTS: PanoramaAsset[] = [
  {
    id: "mist-cabin",
    title: "The Mist Cabin",
    subtitle: "450 sq ft · Forest View · King Bed",
    thumbnail: "/images/room-mist-cabin.png",
    panorama: "/images/panoramas/mist-cabin.jpg",
    preview: "/images/panoramas/preview/mist-cabin.jpg",
    ultraPanorama: "/images/panoramas/8k/mist-cabin.jpg",
    badge: "Popular",
    roomSlug: "mist-cabin",
  },
  {
    id: "canopy-suite",
    title: "The Canopy Suite",
    subtitle: "700 sq ft · Valley View · Jacuzzi",
    thumbnail: "/images/room-canopy.png",
    panorama: "/images/panoramas/canopy-suite.jpg",
    preview: "/images/panoramas/preview/canopy-suite.jpg",
    ultraPanorama: "/images/panoramas/8k/canopy-suite.jpg",
    badge: "Premium",
    roomSlug: "canopy-suite",
  },
  {
    id: "plantation-villa",
    title: "The Plantation Villa",
    subtitle: "1,200 sq ft · Private Estate · 2 Beds",
    thumbnail: "/images/room-villa.png",
    panorama: "/images/panoramas/plantation-villa.jpg",
    preview: "/images/panoramas/preview/plantation-villa.jpg",
    ultraPanorama: "/images/panoramas/8k/plantation-villa.jpg",
    badge: "Signature",
    roomSlug: "plantation-villa",
  },
  {
    id: "infinity-pool",
    title: "Infinity Pool",
    subtitle: "Heated Valley Pool · Panoramic Views",
    thumbnail: "/images/pool-infinity.png",
    panorama: "/images/panoramas/infinity-pool.jpg",
    preview: "/images/panoramas/preview/infinity-pool.jpg",
    ultraPanorama: "/images/panoramas/8k/infinity-pool.jpg",
  },
  {
    id: "reception",
    title: "The Grand Reception",
    subtitle: "Estate Lobby · Coffee Lounge",
    thumbnail: "/images/reception.png",
    panorama: "/images/panoramas/reception.jpg",
    preview: "/images/panoramas/preview/reception.jpg",
    ultraPanorama: "/images/panoramas/8k/reception.jpg",
  },
];

export function getPanoramaById(id: string): PanoramaAsset | undefined {
  return TOUR_SPOTS.find((spot) => spot.id === id);
}

export function getAllPanoramas(): PanoramaAsset[] {
  return TOUR_SPOTS;
}
