"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/*
        Video-ready background: drop a working .mp4 source below (e.g. a file in
        public/videos/ or a valid CDN URL) to switch on the cinematic video.
        Until then, the poster image below serves as the visual.
      */}
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="/images/hero-exterior.png"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-black/40" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="font-lora text-5xl leading-tight text-[#E8EDEB] md:text-7xl"
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
