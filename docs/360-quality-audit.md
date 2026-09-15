# 360° Virtual Property Tour: Quality & Technical Pipeline Audit

This technical diagnostic report documents the complete imaging and rendering pipeline from disk storage $\rightarrow$ network transfer $\rightarrow$ browser memory $\rightarrow$ WebGL GPU texture upload $\rightarrow$ fragment shader coordinate calculation $\rightarrow$ canvas drawing buffer display.

---

## 1. Pipeline Audit Metrics

| Pipeline Stage | Parameter | Measured / Verified Value | Diagnostic Finding |
| :--- | :--- | :--- | :--- |
| **Source Asset** | Location on Disk | `public/images/panoramas/mist-cabin.jpg` | Verified exact file served by Next.js static handler. |
| | Native Dimensions | **848 × 1264 px** | **Severe source deficit.** Aspect ratio is **0.671:1 (Portrait 2:3)**, not 2:1 equirectangular. |
| | File Format & Size | Baseline JPEG (8-bit sRGB), **903,996 bytes** (~882.8 KB) | High file size relative to resolution (~88% quality). Low compression artifacts; blur is not caused by JPEG macroblocking. |
| **Network Delivery** | Downloaded URL | `/images/panoramas/mist-cabin.jpg` | Direct static file delivery. |
| | Downloaded Dimensions | **848 × 1264 px** | Verified via browser HTTP request: served byte-for-byte identical to disk. No Next.js image optimization or resizing occurs. |
| | Content-Encoding | Standard identity/gzip | 0% reduction in source resolution during network transport. |
| **Image Ingestion** | Ingestion Method | `new Image()` in JS | Clean browser native image decode. |
| | Image Transformations | None | No intermediate canvas downsampling, no base64, no blob transcoding. |
| **GPU Texture** | GPU Texture Dimensions | **848 × 1264 px** | Exactly matches source dimensions. GPU `MAX_TEXTURE_SIZE` guard (typically 4096 to 16384) does not downscale this asset. |
| | Texture Format | `gl.RGBA`, `gl.UNSIGNED_BYTE` | Uncompressed 32-bit texture upload in VRAM (~4.3 MB). |
| | Wrap Modes | `gl.CLAMP_TO_EDGE` for S and T | Safe NPOT wrap. Continuous 360° rotation handled by GLSL `fract()`. |
| | Texture Min Filter | `gl.LINEAR` | Mipmaps disabled. |
| | Texture Mag Filter | `gl.LINEAR` | Hardware bilinear filtering. |
| | Anisotropic Filter | `EXT_texture_filter_anisotropic` (8×) | Supported and enabled. |
| **Canvas & Viewport** | CSS Display Size | `width: 100%`, `height: 100%` (e.g. 1920 × 940 px) | Fully expands to modal container. |
| | `devicePixelRatio` | Capped at `2.0` (`Math.min(window.devicePixelRatio, 2)`) | Correctly queries window DPR. |
| | Drawing Buffer Size | `canvas.width = 1920 × DPR`, `canvas.height = 940 × DPR` | Drawing buffer continuously synchronized in render loop to match display physical pixels. |
| **Shader Projection** | Shader Precision | `#ifdef GL_FRAGMENT_PRECISION_HIGH precision highp float;` | Full 32-bit floating-point precision throughout perspective ray calculation. |
| | UV Coordinate Mapping | Equirectangular $\theta \in [-\pi, \pi]$, $\phi \in [-\pi/2, \pi/2]$ | Mathematically correct seamless 360° spherical projection. |

---

## 2. Technical Filtering & Mipmap Analysis

### Magnification vs. Minification in OpenGL / WebGL
Per the OpenGL ES 2.0 / 3.0 and WebGL 1.0 / 2.0 specifications:
* **Texture Magnification ($\lambda \le 0$):** Occurs when one texel projects to more than one pixel on screen. The GPU **strictly evaluates `TEXTURE_MAG_FILTER`**. `TEXTURE_MIN_FILTER` and mipmaps are **completely ignored by the hardware** during magnification.
* **Texture Minification ($\lambda > 0$):** Occurs when multiple texels project into a single screen pixel. The GPU evaluates `TEXTURE_MIN_FILTER`.

### Application to Current Scene
* At a standard $75^\circ$ horizontal field-of-view, looking at the horizon:
  $$\text{Visible Source Texels} = 75^\circ \times \frac{848}{360^\circ} \approx 176.6\text{ texels}$$
  $$\text{Screen Pixels} = 1920\text{ pixels}$$
  Level of Detail: $\lambda = \log_2\left(\frac{176.6}{1920}\right) \approx -3.44 \ll 0$.
* Because $\lambda \le 0$, the texture is operating in **pure magnification**.
* Therefore, `TEXTURE_MAG_FILTER = gl.LINEAR` is the only filter operating across the visible field of view at normal elevations. Mipmaps (and disabling mipmaps) do **not** alter the magnification filter at the horizon.
* Disabling mipmaps (`TEXTURE_MIN_FILTER = gl.LINEAR`) only prevents downsampling at steep polar angles or if a wide FOV is used with an ultra-high-resolution asset.

---

## 3. Physical Source Limitation (The True Bottleneck)

* The current source asset is **848 × 1264 px** in a **portrait (2:3)** orientation.
* A true equirectangular panorama requires a **2:1 aspect ratio** ($360^\circ \times 180^\circ$).
* When an 848 px image is projected across $360^\circ$, 1 source pixel must be magnified across **11 physical screen pixels** (on a 1080p display) or **22 physical pixels** (on a 2× Retina display).
* Bilinear interpolation linearly connects adjacent texels, producing a smooth gradient rather than sharp optical detail. No shader trick, filter setting, or CSS rule can create high-frequency physical detail (e.g. sharp pine needles, fabric weave, window frame edges) that does not exist in the source image.

---

## 4. Hardware Capability & 8K Handling

* The viewer dynamically checks `gl.getParameter(gl.MAX_TEXTURE_SIZE)`.
* **Desktop GPUs:** Common desktop GPUs (Nvidia RTX, AMD Radeon, Apple Silicon M-Series, modern Intel Arc/Iris) support `MAX_TEXTURE_SIZE = 16384` or `8192`. An 8192 × 4096 texture uploads directly to VRAM (~128 MB uncompressed RGBA).
* **Constrained / Mobile Devices:** If a device's `MAX_TEXTURE_SIZE` is `4096`, the viewer's `uploadTextureImage` function detects this and automatically downsamples the image to 4096 × 2048 via an offscreen canvas prior to upload, completely preventing WebGL context crashes.

---

## 5. Summary & Verdict

1. **Rendering Pipeline:** WebGL 2 (with WebGL 1 fallback), `highp float` precision, dynamic DPR buffer synchronization, seamless 360 wrap with `fract()`, and proper resource disposal.
2. **Current Blur Cause:** Solely and directly caused by the **848 × 1264 portrait placeholder asset**.
3. **Readiness:** The codebase is fully ready to receive authentic **4096 × 2048** (standard 4K) or **8192 × 4096** (ultra 8K) 2:1 equirectangular panoramas.
