# 360° Virtual Property Tour: Quality & Sharpness Pipeline Audit

This technical diagnostic report documents the entire imaging and rendering pipeline from source asset on disk $\rightarrow$ network transfer $\rightarrow$ browser memory $\rightarrow$ WebGL GPU texture upload $\rightarrow$ fragment shader coordinate calculation $\rightarrow$ canvas drawing buffer display.

---

## 1. Pipeline Audit Metrics

| Pipeline Stage | Parameter | Measured / Verified Value | Diagnostic Finding |
| :--- | :--- | :--- | :--- |
| **Source Asset** | Location on Disk | `public/images/panoramas/mist-cabin.jpg` | Verified exact file served by Next.js static handler. |
| | Native Dimensions | **848 × 1264 px** | **Severe source deficit.** Aspect ratio is **0.671:1 (Portrait 2:3)**, not 2:1 equirectangular. |
| | File Format & Size | Baseline JPEG (8-bit RGB), **903,996 bytes** (~882.8 KB) | High file size relative to resolution (~88% quality). Low compression artifacts; blur is not caused by JPEG macroblocking. |
| **Network Delivery** | Downloaded URL | `/images/panoramas/mist-cabin.jpg` | Direct static file delivery. |
| | Downloaded Dimensions | **848 × 1264 px** | Verified via browser HTTP request: served byte-for-byte identical to disk. No Next.js image optimization or resizing occurs. |
| | Content-Encoding | Standard gzip/identity | 0% reduction in source resolution during network transport. |
| **Image Ingestion** | Ingestion Method | `new Image()` in JS | Clean browser native image decode. |
| | Image Transformations | None | No intermediate canvas downsampling, no base64, no blob transcoding. |
| **GPU Texture** | GPU Texture Dimensions | **848 × 1264 px** | Exactly matches source dimensions. GPU `MAX_TEXTURE_SIZE` guard (typically 4096 to 16384) does not downscale this asset. |
| | Texture Format | `gl.RGBA`, `gl.UNSIGNED_BYTE` | Uncompressed 32-bit texture upload in VRAM (~4.3 MB). |
| | Wrap Modes | `gl.CLAMP_TO_EDGE` for S and T | Safe NPOT wrap. Continuous 360° rotation handled by GLSL `fract()`. |
| | Texture Min Filter | `gl.LINEAR_MIPMAP_LINEAR` (in WebGL 2) | **Culprit for softening:** Automatic mipmap generation creates lower-res levels (424×632, 212×316). Hardware texture filtering selects lower mip levels at non-perpendicular angles, causing unnecessary blurring. |
| | Texture Mag Filter | `gl.LINEAR` | Hardware bilinear filtering. Replaces 2×2 block pixelation with smooth linear interpolation, but linearly blurs edges when magnified 11×. |
| | Anisotropic Filter | `EXT_texture_filter_anisotropic` (8×) | Supported and enabled. |
| **Canvas & Viewport** | CSS Display Size | `width: 100%`, `height: 100%` (e.g. 1920 × 940 px) | Fully expands to modal container. |
| | `devicePixelRatio` | Capped at `2.0` (`Math.min(window.devicePixelRatio, 2)`) | Correctly queries window DPR. |
| | Drawing Buffer Size | `canvas.width = 1920 × DPR`, `canvas.height = 940 × DPR` | On 1080p (DPR 1.0): 1920 × 940. On 2× Retina: 3840 × 1880. Drawing buffer matches display physical pixels. |
| **Shader Projection** | Shader Precision | `precision mediump float` | **Subtle precision loss:** 10-bit mantissa on mobile/integrated GPUs creates minor coordinate stepping and micro-jitter in trigonometric functions (`atan`, `asin`, `tan`). |
| | UV Coordinate Mapping | Equirectangular $\theta \in [-\pi, \pi]$, $\phi \in [-\pi/2, \pi/2]$ | Mathematically correct seamless 360° spherical projection. |

---

## 2. Quantitative Root Causes of Blur & Softness

### Cause A: Extreme Angular Pixel Deficit (The Physical Source Constraint)
* The source image is only **848 pixels wide**, yet it represents a full **360°** horizontal circle.
* **Angular resolution:** $\frac{848\text{ px}}{360^\circ} = 2.355\text{ pixels per degree}$.
* When viewed at the standard $75^\circ$ horizontal field of view (FOV):
  $$\text{Visible Source Pixels} = 75^\circ \times 2.355\text{ px/deg} \approx 176.6\text{ pixels}$$
* On a standard 1080p desktop display (1920 px wide):
  $$\text{Magnification Factor} = \frac{1920}{176.6} \approx 10.87\times$$
* On a high-DPI / Retina display (3840 physical pixels):
  $$\text{Magnification Factor} = \frac{3840}{176.6} \approx 21.74\times$$
Every single pixel from the source file is stretched across **11 to 22 physical screen pixels**.

### Cause B: Bilinear Minification & Trilinear Mipmap Selection
* Under WebGL 2, `gl.generateMipmap()` created a full mip chain:
  * Level 0: 848 × 1264
  * Level 1: 424 × 632
  * Level 2: 212 × 316
* In a spherical fragment shader, texture coordinate derivatives ($\frac{\partial u}{\partial x}, \frac{\partial u}{\partial y}$) vary non-linearly across the screen. At glancing angles and near the poles, the hardware GPU texture unit selects Mip Level 1 or 2, cutting the already limited source resolution in half or fourth!
* **Correction:** For a panorama texture that is universally magnified across the viewport, disabling mipmaps (`gl.LINEAR` for minification) forces the GPU to **always sample Mip Level 0 (100% native unscaled source pixels)**.

### Cause C: Bilinear Reconstruction Softness vs. Bicubic / Adaptive Sharpening
* Hardware bilinear filtering (`gl.LINEAR`) uses a linear tent filter. When upscaling by $11\times$, linear interpolation produces smooth continuous gradients. While this completely eliminates square block pixelation, it inherently softens high-frequency transitions (e.g. sharp furniture silhouettes, window mullions, mountain ridgelines).
* **Correction:** Integrating a fast, single-pass **Catmull-Rom Bicubic or Contrast-Adaptive Sharpening (CAS)** filter in the fragment shader samples neighboring texels with cubic polynomial weights, restoring sharp perceptual contrast along edges without introducing ringing artifacts.

### Cause D: Shader Float Precision
* The fragment shader was declared with `precision mediump float;`. On integrated Intel GPUs and mobile Adreno/Mali chips, `mediump` has only 10 bits of mantissa, causing loss of precision in `tan(fov * 0.5)` and `atan(rayRot.x, rayRot.z)`.
* **Correction:** Promote shader precision to `precision highp float;` (guaranteed in WebGL 2 and standard on modern WebGL 1).

### Cause E: Resize Timing & Drawing Buffer Synchronization
* In the previous implementation, `updateSize()` was triggered on `useEffect` mount. During modal entrance animations (Framer Motion `initial={{ opacity: 0 }}`), layout bounds may settle after the first animation frame.
* **Correction:** Synchronize `canvas.width` and `canvas.height` continuously in the render loop using `canvas.clientWidth * dpr` and `canvas.clientHeight * dpr`, ensuring the drawing buffer is permanently synchronized with the physical display.

---

## 3. Recommended Actions & Fixes

1. **Disable Mipmap Generation on Magnified Panoramas:**
   Change `gl.TEXTURE_MIN_FILTER` from `gl.LINEAR_MIPMAP_LINEAR` to `gl.LINEAR`. This prevents the GPU from ever selecting downsampled mip levels (424×632 or 212×316), guaranteeing that 100% of native Level-0 pixels are sampled.
2. **Upgrade Shader to High-Precision Floating Point:**
   Use `#ifdef GL_FRAGMENT_PRECISION_HIGH \n precision highp float; \n #endif` to ensure 32-bit floating point precision throughout the spherical projection math.
3. **Implement Hardware-Assisted Texture Sharpening in Fragment Shader:**
   Incorporate a GPU texture sharpening kernel (Contrast-Adaptive Sharpening / unsharp masking) directly into the equirectangular fragment shader. This counteracts bilinear interpolation blur, recovering crisp delineation on edges, window frames, and textures.
4. **Dynamic Resolution Resynchronization in Render Loop:**
   Check `canvas.clientWidth` and `canvas.clientHeight` with `dpr` inside the active animation loop to ensure the drawing buffer is always pixel-perfect on all displays and orientations.
5. **Preserve Compatibility for Real 4K/8K Panoramas:**
   Keep the asset architecture ready so that when authentic 4096×2048 or 8192×4096 equirectangular captures are placed in `public/images/panoramas/4k/`, the viewer renders them with maximum optical fidelity.
