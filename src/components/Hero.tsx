"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll } from "framer-motion";
import HeroBackdrop from "@/components/hero3d/HeroBackdrop";
import { useWeather } from "@/hooks/useWeather";

export default function Hero() {
  const sectionRef = useRef<HTMLElement | null>(null);

  // Scroll progress of the hero leaving the screen. The backdrop turns this
  // into a camera pull-back in the 3D scene (or a slow zoom on the still poster).
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Fetched once here and handed down, so the scene reflects the estate's real
  // weather without a second request from inside the canvas.
  const { weather, displayStatus } = useWeather();

  return (
    <section
      ref={sectionRef}
      // On a portrait phone the copy sits in the upper third, over trees and sky, so the
      // glowing cabins below stay visible instead of hiding behind the buttons.
      className="relative flex min-h-screen items-center justify-center overflow-hidden portrait:items-start portrait:pt-[22vh]"
    >
      {/* Bottom layer: cinematic 3D scene (poster image until it is ready) */}
      <HeroBackdrop
        scrollProgress={scrollYProgress}
        weather={weather}
        displayStatus={displayStatus}
      />

      {/* Top layer: copy, centered on the viewport independently of the scene below */}
      <div className="relative z-20 mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="font-lora text-5xl leading-tight text-balance text-[#E8EDEB] drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)] md:text-7xl"
        >
          Escape to the Heart of the Highlands
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.25 }}
          className="mt-10 flex flex-col items-center gap-4 md:flex-row"
        >
          <Link
            href="mailto:tawsifk35@gmail.com?subject=Booking%20Inquiry%20-%20The%20Highland%20Estate"
            className="rounded-full bg-[#4A3320] px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-[#4A3320]/90"
          >
            Book Your Stay
          </Link>
          <Link
            href="#rooms"
            className="rounded-full border border-[#E8EDEB]/85 bg-black/25 px-8 py-3 text-sm font-medium text-[#E8EDEB] backdrop-blur-sm transition-colors hover:bg-[#E8EDEB]/15"
          >
            Explore Estate
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
