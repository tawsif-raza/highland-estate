# 360° Panorama Assets Directory

This folder contains all panoramic 360° virtual tour imagery for The Highland Estate.

## Directory Structure
* `masters/`: Archival, uncompressed camera originals and high-res 8K renders (PNG, TIFF, high-bitrate JPEG). Never served directly over the web.
* `preview/`: Low-resolution 2:1 previews (**1024 × 512 px**, ~100 KB) used for instant progressive loading.
* `4k/`: Production web standard 2:1 equirectangular panoramas (**4096 × 2048 px**, ~1.5–2.5 MB).
* `8k/`: Ultra-HD 2:1 equirectangular panoramas (**8192 × 4096 px**, ~4–7 MB) for high-DPI desktop viewports.
* Root (`*.jpg`): Primary backwards-compatible delivery assets.

## Required Format
* **Aspect Ratio:** Strictly **2:1** (Equirectangular 360° × 180°).
* **Minimum Resolution:** 4096 × 2048 px.
* **Preferred Formats:** WebP or high-quality JPEG (Quality 84–88).
* **No Rectilinear Photos:** Standard 16:9 or vertical portrait photos cannot be projected onto the 360° sphere without severe distortion.

For the complete technical specification, camera guidelines, and workflow instructions, see [`/docs/PANORAMA_SPECIFICATION.md`](../../docs/PANORAMA_SPECIFICATION.md).
