"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

// Loaded lazily and only on the "high" quality tier, so the post-processing
// library never reaches phones or mid-range machines.
export default function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.6} radius={0.6} />
      <Vignette offset={0.3} darkness={0.55} />
    </EffectComposer>
  );
}
