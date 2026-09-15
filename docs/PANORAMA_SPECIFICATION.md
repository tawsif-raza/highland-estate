# High-Resolution 360° Panorama Asset Specification & Pipeline Guide

This document defines the architectural, optical, format, and compression requirements for adding high-resolution 360° virtual property tour assets to The Highland Estate web application.

---

## 1. Projection & Geometry Requirements

### Equirectangular Projection (Strict 2:1 Aspect Ratio)
The 360° WebGL viewer projects the panorama onto a virtual unit sphere using an equirectangular coordinate mapping:
* **Horizontal Coverage:** Exactly **360°** ($-\pi \le \theta \le +\pi$).
* **Vertical Coverage:** Exactly **180°** ($-\frac{\pi}{2} \le \phi \le +\frac{\pi}{2}$).
* **Aspect Ratio:** Must be strictly **2:1** (`Width = 2 × Height`).
* **Seam Continuity:** The left vertical edge ($x = 0$) and right vertical edge ($x = \text{Width}$) represent the exact same azimuth bearing ($180^\circ$ rear). The image must wrap seamlessly across these edges with zero pixel discontinuity, color mismatch, or vignette seams.
* **Zenith & Nadir:** 
  * The top horizontal edge ($y = 0$) maps directly to the zenith (looking straight up into the ceiling/sky, $+90^\circ$).
  * The bottom horizontal edge ($y = \text{Height}$) maps directly to the nadir (looking straight down into the tripod/floor, $-90^\circ$).
  * Any tripod, monopod base, or camera mount must be retouched/cloned out at the nadir for luxury property presentation.

> [!CAUTION]
> **Do NOT use standard rectilinear photos, portrait captures, or wide-angle panoramic crops.**
> Standard camera photos (such as 16:9, 4:3, or 2:3 portrait shots) produce severe spherical pinch, vertical stretching, and disorienting fishbowl warping when projected onto the 360° sphere.

---

## 2. Dimension & Resolution Tiers

To achieve needle-sharp architectural rendering while maintaining mobile compatibility, assets are organized into three tiers:

| Tier | Dimensions | Aspect Ratio | VRAM Footprint | Target File Size | Target Device / Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Preview** | **1024 × 512** | 2:1 | ~2 MB | 80 KB – 150 KB | Instant progressive load (all devices) |
| **Standard 4K** *(Recommended)* | **4096 × 2048** | 2:1 | 32 MB | 1.5 MB – 2.5 MB | Universal web standard (Mobile, Tablet, Desktop) |
| **Ultra 8K** | **8192 × 4096** | 2:1 | 128 MB | 4.0 MB – 7.0 MB | High-DPI Desktop / 4K Displays (where supported) |
| **Master RAW** | **8192 × 4096+** | 2:1 | N/A (Archive) | 20 MB – 100 MB | Master archive; never served directly to web clients |

### Angular Pixel Density Comparison
* **Current placeholder assets (848 × 1264 portrait):** 2.35 pixels per degree horizontal. At a 75° field-of-view, only **~176 pixels** cover a full 1920px screen width (~11× blur/magnification).
* **4096 × 2048 (4K):** 11.38 pixels per degree horizontal. At a 75° field-of-view, **~853 source pixels** cover the screen. Combined with WebGL bilinear/anisotropic filtering, this delivers clean, crisp architectural detail.
* **8192 × 4096 (8K):** 22.76 pixels per degree horizontal. At a 75° field-of-view, **~1707 source pixels** cover the screen, approaching 1:1 physical pixel fidelity on a 1080p/1440p monitor.

---

## 3. Recommended Formats & Compression Settings

### Delivery Formats
1. **WebP (Primary Recommendation):**
   * Quality: `82–88` (lossy) with sharp YUV enabled.
   * Delivers 30–45% smaller file sizes than baseline JPEG at identical visual quality.
2. **JPEG (Fallback / Universal Compatibility):**
   * Quality: `85–90` (standard 4:4:4 or 4:2:2 chroma subsampling).
   * Progressive encoding enabled (`mozjpeg` recommended).
3. **AVIF (Next-Gen):**
   * Quality: `75–82`. Supported in modern evergreen browsers.

---

## 4. Hardware Limitations & VRAM Analysis

### Maximum Texture Dimensions (`MAX_TEXTURE_SIZE`)
Every device's GPU driver enforces a maximum texture dimension limit:
* **High-end Desktop GPUs (Nvidia RTX, AMD Radeon, Apple M-Series):** `MAX_TEXTURE_SIZE = 16384` (can display up to 16K textures).
* **Mid-range Desktop & Modern Flagship Mobile (A16+, Snapdragon 8 Gen 2+):** `MAX_TEXTURE_SIZE = 8192`.
* **Budget Mobile & Older Laptops:** `MAX_TEXTURE_SIZE = 4096`.

> [!IMPORTANT]
> The updated [`PanoramaViewer.tsx`](file:///c:/testimonial_demo_website/highland-estate/src/components/PanoramaViewer.tsx) automatically queries `gl.getParameter(gl.MAX_TEXTURE_SIZE)`. If an 8K panorama is loaded on a 4K-capped device, the viewer automatically downscales the image via an offscreen canvas to the hardware limit, preventing WebGL context crashes.

### VRAM Calculation
Uncompressed RGBA texture VRAM formula:
$$\text{VRAM} = \text{Width} \times \text{Height} \times 4 \text{ bytes}$$
* **4096 × 2048:** $4096 \times 2048 \times 4 = 33,554,432\text{ bytes} \approx 32\text{ MB}$. With mipmaps (+33%): **~42.6 MB**.
* **8192 × 4096:** $8192 \times 4096 \times 4 = 134,217,728\text{ bytes} \approx 128\text{ MB}$. With mipmaps (+33%): **~170 MB**.

---

## 5. Multi-Resolution / Tiled Panoramas Investigation

Requirement 9 asks to evaluate a multi-resolution / tiled approach for ultra-high-resolution panoramas:

### Why Multi-Resolution / Tiling?
When delivering panoramas beyond 8K (e.g. 12K or 16K gigapixel captures), loading a single 200 MB+ texture exhausts mobile browser memory limits and causes network stalls.

### How Tiled Multi-Resolution Works:
1. **Cubemap Projection:** The equirectangular sphere is converted into 6 square cube faces: Front, Back, Left, Right, Top, Bottom.
2. **Quadtree Tile Hierarchy:**
   * Level 0: 1 tile per face (512 × 512).
   * Level 1: 4 tiles per face (1024 × 1024 total).
   * Level 2: 16 tiles per face (2048 × 2048 total).
   * Level 3: 64 tiles per face (4096 × 4096 total).
3. **Frustum Culling:** Only tiles currently intersecting the camera's FOV frustum are downloaded and bound to GPU VRAM.
4. **Tooling:** Free tools such as `krpano`, `marzipano-tool`, or open-source `equirect-to-cubemap` tools slice equirectangular master images into deep-zoom multi-res tiles.

### Recommendation for Current Architecture:
* For property and resort websites, **single-texture 4K (4096 × 2048) with a 1024 × 512 preview** offers the sweet spot: instantaneous load times, 32 MB VRAM footprint, 100% universal device compatibility, and zero complexity.
* If 12K+ gigapixel zoom tours are commissioned in the future, the tile pyramid format should be generated using Marzipano or Pannellum Multi-Res tooling and served via an Amazon S3 or CDN tile folder.

---

## 6. Directory Structure & File Organization

The asset hierarchy is organized as follows:

```
public/images/panoramas/
├── README.md                      # Quick reference for media editors
├── masters/                       # Master archival captures (PNG, TIFF, 8K+ originals)
│   ├── .gitkeep
│   ├── mist-cabin-master.png      (Archival source; not served to web)
│   └── canopy-suite-master.png
├── preview/                       # Fast 1024 × 512 progressive previews (~100 KB)
│   ├── .gitkeep
│   ├── mist-cabin.jpg
│   └── canopy-suite.jpg
├── 4k/                            # Standard production delivery (4096 × 2048 WebP/JPEG)
│   ├── .gitkeep
│   ├── mist-cabin.jpg
│   └── canopy-suite.jpg
├── 8k/                            # Ultra-HD desktop delivery (8192 × 4096)
│   ├── .gitkeep
│   ├── mist-cabin.jpg
│   └── canopy-suite.jpg
└── [id].jpg                       # Primary delivery root (backwards compatible)
```

---

## 7. Step-by-Step Workflow for Adding a New Room / Property Tour

### Step 1: Capture or Render
* **3D Renderers (Blender, V-Ray, Corona, Unreal Engine):**
  * Set camera projection to **Panoramic / Equirectangular** (Spherical 360° × 180°).
  * Render resolution: **4096 × 2048** (or **8192 × 4096**).
* **Photographic 360 Cameras (Insta360 Pro 2, Ricoh Theta Z1, DSLR Panhead with Fisheye):**
  * Stitch multi-bracket exposures into a 32-bit HDR or high-quality 16-bit TIFF.
  * Retouch the nadir tripod footprint.
  * Export 8-bit sRGB JPEG/PNG at 8192 × 4096 or 4096 × 2048.

### Step 2: Archive the Master File
Copy the full-quality output into:
```
public/images/panoramas/masters/[room-slug]-master.png
```

### Step 3: Generate Web Delivery Variants
Run image optimization (e.g. using ImageMagick, Sharp, or Squoosh):

```bash
# 1. Generate 1024 × 512 Preview (~100 KB)
magick master.png -resize 1024x512! -quality 82 preview/[room-slug].jpg

# 2. Generate 4096 × 2048 Standard 4K Web Delivery (~2 MB)
magick master.png -resize 4096x2048! -quality 86 4k/[room-slug].jpg

# 3. Generate 8192 × 4096 Ultra-HD Delivery (~5 MB)
magick master.png -resize 8192x4096! -quality 84 8k/[room-slug].jpg

# 4. Copy 4K as primary root delivery
cp 4k/[room-slug].jpg [room-slug].jpg
```

### Step 4: Register the Spot in `src/lib/panorama-data.ts`
Add the room entry to `TOUR_SPOTS`:

```typescript
{
  id: "estate-terrace",
  title: "The Estate Sunset Terrace",
  subtitle: "Panoramic Valley & Tea Hills Overlook",
  thumbnail: "/images/terrace-thumbnail.png",
  panorama: "/images/panoramas/estate-terrace.jpg",
  preview: "/images/panoramas/preview/estate-terrace.jpg",
  ultraPanorama: "/images/panoramas/8k/estate-terrace.jpg",
  badge: "New",
  roomSlug: "terrace",
}
```

The virtual tour grid and fullscreen 360 viewer will automatically display the new room with progressive loading enabled.
