"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import RainFogOverlay from "./RainFogOverlay";

const HERO_IMAGE = "/images/hero-exterior.png";

export default function Hero() {
  const sectionRef = useRef<HTMLElement | null>(null);

  // Drives a cinematic zoom as the hero scrolls out of view. This replaces
  // the earlier "grow from a tiny box" scroll-jacking approach: the image
  // fills the screen from the first frame, exactly like a normal hero
  // background, and just scales up slightly as the user scrolls past it.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* Bottom layer: full-screen background image, subtly zooming on scroll */}
      <motion.div
        className="absolute inset-0 z-0 overflow-hidden"
        style={{ scale: imageScale }}
      >
        <Image
          src={HERO_IMAGE}
          alt="The Highland Estate at dusk, misty cabins glowing among the hills"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/60" />

        {/* Middle layer: rain/fog, locked to the same bounds as the image, clipped by overflow-hidden above */}
        <RainFogOverlay />
      </motion.div>

      {/* Top layer: copy, centered on the viewport independently of the image/rain layers below */}
      <div className="relative z-20 mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="font-lora text-5xl leading-tight text-[#E8EDEB] drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)] md:text-7xl"
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
            className="rounded-full border border-[#E8EDEB] px-8 py-3 text-sm font-medium text-[#E8EDEB] transition-colors hover:bg-[#E8EDEB]/10"
          >
            Explore Estate
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
