"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Fade-in on scroll wrapper (matching estate pattern)                */
/* ------------------------------------------------------------------ */
function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
        } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Carriage Heritage Data Model (Belmond & Orient Express Pattern)   */
/* ------------------------------------------------------------------ */
interface CarriageInfo {
  id: "locomotive" | "dining" | "sleeper" | "lounge";
  title: string;
  type: string;
  badge: string;
  builtYear: string;
  capacity: string;
  tagline: string;
  description: string;
  craftDetails: string[];
  amenities: string[];
}

const CARRIAGES: CarriageInfo[] = [
  {
    id: "locomotive",
    title: "The Coorg Sovereign",
    type: "4-6-2 Mountain Express Steam Engine",
    badge: "Locomotive • No. 42",
    builtYear: "Forged 1928",
    capacity: "Master Engineer Crew of 2",
    tagline: "Hand-riveted steel boiler delivering high-torque mountain ascent.",
    description:
      "Crafted by the North British Locomotive Works for the high-altitude Western Ghats coffee passages. Features heavy cast-iron chassis framing, solid polished brass boiler banding, and enclosed driver cabs designed specifically to withstand dense monsoon cloudbursts.",
    craftDetails: [
      "Solid polished brass boiler straps & steam dome",
      "Triple-chime mountain echo whistle",
      "High-output warm tungsten lantern beam",
      "Reinforced steel wedge pilot for mountain tracks",
    ],
    amenities: [
      "Real coal-fired steam pressure",
      "Dual mechanical lubricators",
      "Hand-calibrated mountain gradient regulator",
    ],
  },
  {
    id: "dining",
    title: "The Nilgiri Dining Salon",
    type: "First-Class Gastronomic Car",
    badge: "Carriage No. 2",
    builtYear: "Commissioned 1932",
    capacity: "16 Discerning Guests",
    tagline: "Candlelit degustation menus paired with estate single-origin brews.",
    description:
      "Panelled in aged Nilgiri teak and wild rosewood, this dining car echoes the gilded era of grand continental rail. Guests savor multi-course farm-to-table tasting menus alongside our master roaster's rare microlots while gliding above mist-draped shola valleys.",
    craftDetails: [
      "Art Deco marquetry inlays & brass picture rails",
      "Silk pleated table lamps with warm amber glow",
      "Double-glazed acoustic insulation against track rumble",
      "Solid mahogany captain's dining chairs",
    ],
    amenities: [
      "Four-course seasonal plantation menu",
      "Curated old-world wine pairings",
      "Dedicated silver-service white glove butler",
      "Freshly pulled espresso bar on rails",
    ],
  },
  {
    id: "sleeper",
    title: "The Shola Sleeper",
    type: "Grand Luxury Berth Carriage",
    badge: "Carriage No. 3",
    builtYear: "Commissioned 1934",
    capacity: "8 Private Suites",
    tagline: "Private staterooms with hand-carved berths and panoramic views.",
    description:
      "Designed for restful contemplation between mountain ridges. Each private cabin is lined in fragrant cedar and hand-loomed cotton linens, offering peaceful sanctuaries with sweeping floor-to-ceiling vistas of the ancient stone viaduct arches.",
    craftDetails: [
      "Hand-carved cedar & rosewood cabinetry",
      "Goose down bedding & monogrammed highland wool blankets",
      "Concealed brass luggage & wardrobe compartments",
      "Independent climate and ventilation controls",
    ],
    amenities: [
      "Evening lavender and rain mist turndown ritual",
      "Wake-up pour-over coffee served in-berth",
      "En-suite vanity with artisanal botanical soaps",
      "Curated heritage reading library",
    ],
  },
  {
    id: "lounge",
    title: "The Malabar Observation Lounge",
    type: "Panoramic Observation Salon",
    badge: "Carriage No. 1",
    builtYear: "Commissioned 1936",
    capacity: "14 Guests",
    tagline: "Curved rear bay glass framing 180° gorges and mountain mist.",
    description:
      "Situated at the train's trailing edge, the observation salon offers an unobstructed window onto the viaduct's stone curves. Wicker lounge armchairs and low mahogany cocktail tables invite conversation over afternoon high tea and twilight aperitifs.",
    craftDetails: [
      "Curved panoramic observation bay windows",
      "Hand-woven Malabar cane armchairs with velvet cushions",
      "Polished brass observation platform railings",
      "Custom wool carpets inspired by tea terrace contours",
    ],
    amenities: [
      "Afternoon estate high tea & delicate pastries",
      "Brass astronomical binoculars for wildlife spotting",
      "Evening single-malt digestifs by lantern light",
      "Direct open-air rear viewing deck",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Procedural Web Audio Engine (Polite, Zero-Dependency Ambient Sound)*/
/* ------------------------------------------------------------------ */
class MountainRailSoundEngine {
  private ctx: AudioContext | null = null;
  private timer: number | null = null;
  private noiseNode: AudioNode | null = null;

  public start(speedMs: number) {
    if (this.ctx && this.ctx.state === "running") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master volume limiter (gentle, quiet, polite)
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      masterGain.connect(this.ctx.destination);

      // Low ambient mountain wind (pink-filtered noise)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.04;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = "lowpass";
      windFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

      noise.connect(windFilter);
      windFilter.connect(masterGain);
      noise.start();
      this.noiseNode = noise;

      // Periodic rhythmic rail click-clack: rhythm of sleepers
      const playClick = () => {
        if (!this.ctx || this.ctx.state !== "running") return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.04);

        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.06);

        // Secondary clack 80ms later (classic dual-axle click-clack)
        setTimeout(() => {
          if (!this.ctx || this.ctx.state !== "running") return;
          const t = this.ctx.currentTime;
          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();

          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(115, t);
          osc2.frequency.exponentialRampToValueAtTime(40, t + 0.035);

          gain2.gain.setValueAtTime(0.16, t);
          gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

          osc2.connect(gain2);
          gain2.connect(masterGain);

          osc2.start(t);
          osc2.stop(t + 0.05);
        }, 75);
      };

      playClick();
      this.timer = window.setInterval(playClick, speedMs);
    } catch {
      // Graceful fallback if Web Audio is unsupported
    }
  }

  public updatePace(speedMs: number) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = window.setInterval(() => {
        if (!this.ctx || this.ctx.state !== "running") return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.04);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      }, speedMs);
    }
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.noiseNode) {
      try {
        (this.noiseNode as AudioBufferSourceNode).stop();
      } catch {
        // Ignored
      }
      this.noiseNode = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {
        // Ignored
      }
      this.ctx = null;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Main Highland Railway Component                                    */
/* ------------------------------------------------------------------ */
export default function HighlandRailwayScene() {
  const [isPaused, setIsPaused] = useState(false);
  const [speedMode, setSpeedMode] = useState<"scenic" | "stately" | "express">("stately");
  const [atmosphere, setAtmosphere] = useState<"dusk" | "midnight" | "dawn">("dusk");
  const [selectedCarriage, setSelectedCarriage] = useState<CarriageInfo | null>(null);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const soundEngineRef = useRef<MountainRailSoundEngine | null>(null);

  // Map speed modes to animation traverse duration
  const traverseSeconds = speedMode === "scenic" ? 44 : speedMode === "stately" ? 28 : 18;
  const audioIntervalMs = speedMode === "scenic" ? 950 : speedMode === "stately" ? 620 : 420;

  // Toggle Soundscape gracefully
  const toggleAudio = useCallback(() => {
    if (isAudioOn) {
      soundEngineRef.current?.stop();
      setIsAudioOn(false);
    } else {
      if (!soundEngineRef.current) {
        soundEngineRef.current = new MountainRailSoundEngine();
      }
      soundEngineRef.current.start(audioIntervalMs);
      setIsAudioOn(true);
    }
  }, [isAudioOn, audioIntervalMs]);

  // Update audio cadence when speed changes
  useEffect(() => {
    if (isAudioOn && soundEngineRef.current) {
      soundEngineRef.current.updatePace(audioIntervalMs);
    }
  }, [audioIntervalMs, isAudioOn]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      soundEngineRef.current?.stop();
    };
  }, []);

  // Keyboard accessibility for carriage modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedCarriage) {
        setSelectedCarriage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCarriage]);

  return (
    <section
      id="journey"
      className="relative w-full overflow-hidden bg-gradient-to-b from-secondary via-[#14231A] to-dark-accent py-24 sm:py-32 text-[#E8EDEB]"
      aria-label="The Highland Journey - Cinematic Railway Experience"
    >
      {/* Top & Bottom gradient feathering for seamless blending with neighboring sections */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-secondary to-transparent z-20" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-dark-accent to-transparent z-20" />

      {/* Atmospheric background ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-950/20 blur-[120px]" />
      <div className="pointer-events-none absolute right-10 top-1/2 h-80 w-80 rounded-full bg-amber-600/5 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Storytelling Header */}
        <FadeIn>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-accent/70 backdrop-blur-sm shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              The Heritage Voyage • Western Ghats
            </span>
            <h2 className="mt-5 font-lora text-4xl leading-tight text-accent sm:text-5xl md:text-6xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
              Where the Mist Carries You Farther
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-accent/70 sm:text-lg">
              A private vintage mountain express traversing the ancient stone viaduct, winding through
              rainforest canopies and coffee valleys into the quiet heart of The Highland Estate.
            </p>
          </div>
        </FadeIn>

        {/* Cinematic Panoramic Stage with Integrated Control Deck */}
        <FadeIn delay={150}>
          <div className="relative mx-auto mt-12 sm:mt-16 w-full">

            {/* The Scenic Canvas Container */}
            <div
              className={`relative h-[380px] sm:h-[460px] md:h-[510px] w-full overflow-hidden rounded-3xl border border-white/10 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85)] transition-colors duration-1000 ${atmosphere === "dusk"
                ? "bg-gradient-to-b from-[#09130D] via-[#16271D] to-[#0A130E]"
                : atmosphere === "midnight"
                  ? "bg-gradient-to-b from-[#040A06] via-[#09170E] to-[#030805]"
                  : "bg-gradient-to-b from-[#142319] via-[#243527] to-[#0F1B13]"
                }`}
            >
              {/* Glassmorphic Control Deck Floating in Upper Right */}
              <div className="absolute top-4 right-4 z-40 flex flex-wrap items-center justify-end gap-2 sm:gap-3">

                {/* Atmosphere Mood Selector */}
                <div className="hidden sm:inline-flex items-center rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-md text-[11px]">
                  <button
                    type="button"
                    onClick={() => setAtmosphere("dusk")}
                    className={`rounded-full px-2.5 py-1 font-medium transition-all cursor-pointer ${atmosphere === "dusk"
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                      : "text-white/60 hover:text-white"
                      }`}
                    aria-label="Set atmosphere to Dusk"
                  >
                    Dusk
                  </button>
                  <button
                    type="button"
                    onClick={() => setAtmosphere("midnight")}
                    className={`rounded-full px-2.5 py-1 font-medium transition-all cursor-pointer ${atmosphere === "midnight"
                      ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                      : "text-white/60 hover:text-white"
                      }`}
                    aria-label="Set atmosphere to Midnight"
                  >
                    Midnight
                  </button>
                  <button
                    type="button"
                    onClick={() => setAtmosphere("dawn")}
                    className={`rounded-full px-2.5 py-1 font-medium transition-all cursor-pointer ${atmosphere === "dawn"
                      ? "bg-rose-400/20 text-rose-300 border border-rose-400/30"
                      : "text-white/60 hover:text-white"
                      }`}
                    aria-label="Set atmosphere to Dawn Mist"
                  >
                    Dawn
                  </button>
                </div>

                {/* Pace / Speed Selector */}
                <div className="inline-flex items-center rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-md text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSpeedMode("scenic")}
                    className={`rounded-full px-2.5 py-1 font-medium transition-all cursor-pointer ${speedMode === "scenic"
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "text-white/60 hover:text-white"
                      }`}
                    aria-label="Scenic slow pace (44s)"
                  >
                    Scenic
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpeedMode("stately")}
                    className={`rounded-full px-2.5 py-1 font-medium transition-all cursor-pointer ${speedMode === "stately"
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "text-white/60 hover:text-white"
                      }`}
                    aria-label="Stately standard pace (28s)"
                  >
                    Stately
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpeedMode("express")}
                    className={`rounded-full px-2.5 py-1 font-medium transition-all cursor-pointer ${speedMode === "express"
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "text-white/60 hover:text-white"
                      }`}
                    aria-label="Express fast pace (18s)"
                  >
                    Express
                  </button>
                </div>

                {/* Play / Pause Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsPaused((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 text-xs font-medium tracking-wide text-[#E8EDEB]/90 backdrop-blur-md transition-all hover:bg-black/75 hover:text-white hover:border-white/35 focus:outline-none focus:ring-2 focus:ring-accent/40 shadow-lg cursor-pointer"
                  aria-label={isPaused ? "Resume train journey" : "Pause train traversal to inspect carriages"}
                >
                  <span
                    className={`h-2 w-2 rounded-full transition-colors ${isPaused ? "bg-amber-400" : "bg-emerald-400 animate-pulse"
                      }`}
                  />
                  <span>{isPaused ? "Resume" : "Pause"}</span>
                </button>

                {/* Ambient Soundscape Button (Optional, polite Web Audio API) */}
                <button
                  type="button"
                  onClick={toggleAudio}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium tracking-wide backdrop-blur-md transition-all focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer ${isAudioOn
                    ? "border-amber-400/40 bg-amber-400/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                    : "border-white/10 bg-black/40 text-white/65 hover:bg-black/60 hover:text-white"
                    }`}
                  aria-label={isAudioOn ? "Mute ambient mountain rail audio" : "Enable gentle ambient rail soundscape"}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isAudioOn ? (
                      <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
                    ) : (
                      <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                    )}
                  </svg>
                  <span className="hidden sm:inline">{isAudioOn ? "Audio On" : "Audio Off"}</span>
                </button>
              </div>

              {/* Live Mountain Telemetry HUD (Bottom-Left of Canvas) */}
              <div className="absolute bottom-4 left-4 z-30 pointer-events-none hidden sm:flex flex-col gap-1 rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-[11px] tracking-wide text-accent/80 backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-semibold text-white/90">Glen Coorg Viaduct • Pier 7 Passage</span>
                </div>
                <div className="flex items-center gap-3 text-white/55 text-[10px]">
                  <span>Elev: 1,120m</span>
                  <span>•</span>
                  <span>Incline: 1.8° Gradient</span>
                  <span>•</span>
                  <span>Consist: 4 Cars</span>
                </div>
              </div>

              {/* Sky Background & Veiled Mountain Moon */}
              <div className="pointer-events-none absolute inset-0">
                {/* Moon Glow adapted to atmosphere */}
                <div
                  className={`absolute left-[38%] top-8 h-28 w-28 rounded-full blur-2xl transition-opacity duration-1000 ${atmosphere === "midnight"
                    ? "bg-emerald-100/20 opacity-90"
                    : atmosphere === "dawn"
                      ? "bg-amber-200/25 opacity-75"
                      : "bg-amber-100/10 opacity-60"
                    }`}
                />
                <div
                  className={`absolute left-[38%] top-12 h-16 w-16 rounded-full blur-md transition-all duration-1000 ${atmosphere === "midnight"
                    ? "bg-gradient-to-br from-slate-100/40 via-emerald-100/20 to-transparent"
                    : atmosphere === "dawn"
                      ? "bg-gradient-to-br from-amber-100/35 via-rose-200/20 to-transparent"
                      : "bg-gradient-to-br from-amber-50/20 via-amber-100/10 to-transparent"
                    }`}
                />

                {/* Stars / Atmospheric Particulate Shimmer */}
                <div
                  className={`mountain-stars absolute inset-0 transition-opacity duration-1000 ${atmosphere === "midnight" ? "opacity-75" : atmosphere === "dawn" ? "opacity-20" : "opacity-40"
                    }`}
                />

                {/* Overcast Cloud Drift */}
                <div className="sky-cloud-drift absolute inset-0 opacity-25" />
              </div>

              {/* Layer 1: Far Mountain Silhouettes */}
              <svg
                className={`pointer-events-none absolute bottom-0 left-0 w-full h-[65%] transition-colors duration-1000 ${atmosphere === "dawn" ? "text-[#122018] opacity-85" : "text-[#091510] opacity-80"
                  }`}
                viewBox="0 0 1440 280"
                preserveAspectRatio="none"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M0,280 L0,140 Q160,80 320,120 T640,90 T960,110 T1280,70 Q1380,85 1440,95 L1440,280 Z" />
              </svg>

              {/* Distant Mountain Mist Belt */}
              <div className="pointer-events-none absolute bottom-[26%] inset-x-0 h-16 bg-gradient-to-t from-[#0E1C14]/90 via-[#0E1C14]/40 to-transparent" />

              {/* Layer 2: Mid-Ground Shola Ridges & Distant Valley Lanterns */}
              <svg
                className="pointer-events-none absolute bottom-0 left-0 w-full h-[55%] text-[#0E1E16]"
                viewBox="0 0 1440 240"
                preserveAspectRatio="none"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M0,240 L0,110 Q120,60 260,85 T540,55 T820,95 T1120,50 T1440,80 L1440,240 Z" />
              </svg>

              {/* Distant Warm Estate Cabin Lanterns in the Forest */}
              <div className="pointer-events-none absolute bottom-[38%] left-[18%] h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B] animate-pulse" />
              <div
                className="pointer-events-none absolute bottom-[42%] left-[48%] h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_10px_#F59E0B] animate-pulse"
                style={{ animationDelay: "1.2s" }}
              />
              <div
                className="pointer-events-none absolute bottom-[35%] left-[78%] h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B] animate-pulse"
                style={{ animationDelay: "2.4s" }}
              />

              {/* Layer 3: The Ancient Stone Mountain Viaduct */}
              <div className="pointer-events-none absolute bottom-0 inset-x-0 h-32 sm:h-36">
                {/* Viaduct Masonry Structure */}
                <svg
                  className="w-full h-full text-[#14231B] drop-shadow-[0_-4px_16px_rgba(0,0,0,0.6)]"
                  viewBox="0 0 1440 140"
                  preserveAspectRatio="none"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M0,140 L0,22 H1440 V140 H1410 V65 Q1355,10 1300,65 V140 H1250 V65 Q1195,10 1140,65 V140 H1090 V65 Q1035,10 980,65 V140 H930 V65 Q875,10 820,65 V140 H770 V65 Q715,10 660,65 V140 H610 V65 Q555,10 500,65 V140 H450 V65 Q395,10 340,65 V140 H290 V65 Q235,10 180,65 V140 H130 V65 Q75,10 20,65 V140 Z" />
                  <rect x="0" y="18" width="1440" height="4" fill="#1C2E24" />
                </svg>

                {/* Ballast Gravel Bed on Bridge Deck */}
                <div className="absolute top-[12px] inset-x-0 h-3 bg-gradient-to-b from-[#09100C] to-[#121E17]" />

                {/* Sleepers / Railway Ties */}
                <div className="viaduct-sleepers absolute top-[13px] inset-x-0 h-2 opacity-70" />

                {/* Steel Rail - Base & Shadow */}
                <div className="absolute top-[17px] inset-x-0 h-[2px] bg-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />

                {/* Steel Rail - Moonlit Polished Chrome Running Surface */}
                <div className="absolute top-[16px] inset-x-0 h-[1.5px] bg-gradient-to-r from-slate-400/40 via-slate-100/75 to-slate-400/40 shadow-[0_0_6px_rgba(226,232,240,0.3)]" />
              </div>

              {/* ======================================================== */}
              {/* Layer 4: The Highland Express Train Assembly              */}
              {/* ======================================================== */}
              <div className="highland-express-track absolute bottom-[108px] sm:bottom-[122px] inset-x-0 h-16 pointer-events-none">
                <div
                  className={`highland-express-mover absolute bottom-0 left-0 flex items-end ${isPaused ? "train-paused" : ""
                    }`}
                  style={{
                    animationDuration: `${traverseSeconds}s`,
                  }}
                >
                  {/* Forward Volumetric Headlight Light Cone */}
                  <div className="pointer-events-none absolute -right-52 bottom-1.5 h-16 w-56 bg-gradient-to-r from-amber-300/60 via-amber-200/20 to-transparent blur-[6px] rounded-r-full" />
                  <div className="pointer-events-none absolute -right-44 bottom-2.5 h-8 w-48 bg-gradient-to-r from-amber-100/80 via-amber-200/30 to-transparent blur-[2px] rounded-r-full" />

                  {/* SVG Highland Mountain Express (Locomotive + Tender + 3 Carriages) */}
                  <svg
                    className="h-14 w-[430px] sm:h-16 sm:w-[490px] drop-shadow-[0_8px_20px_rgba(0,0,0,0.85)] pointer-events-auto"
                    viewBox="0 0 490 52"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="bodyGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#253E30" />
                        <stop offset="45%" stopColor="#192B21" />
                        <stop offset="100%" stopColor="#0F1B14" />
                      </linearGradient>
                      <linearGradient id="locoDark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B2A1D" />
                        <stop offset="45%" stopColor="#241911" />
                        <stop offset="100%" stopColor="#140D09" />
                      </linearGradient>
                      <linearGradient id="brassGold" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#C99F37" />
                        <stop offset="50%" stopColor="#F5DC8C" />
                        <stop offset="100%" stopColor="#A88122" />
                      </linearGradient>
                      <linearGradient id="warmWindow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFF2A3" />
                        <stop offset="60%" stopColor="#FDE047" />
                        <stop offset="100%" stopColor="#F59E0B" />
                      </linearGradient>
                      <linearGradient id="steelWheel" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#64748B" />
                        <stop offset="100%" stopColor="#1E293B" />
                      </linearGradient>
                    </defs>

                    {/* ---------------------------------------------------- */}
                    {/* CARRIAGE 3 (The Shola Sleeper)                       */}
                    {/* ---------------------------------------------------- */}
                    <g
                      id="carriage-3"
                      className="cursor-pointer transition-opacity hover:opacity-90"
                      onClick={() => setSelectedCarriage(CARRIAGES[2])}
                    >
                      <rect x="2" y="32" width="90" height="4" rx="1.5" fill="#0D1410" />
                      <rect x="3" y="12" width="88" height="21" rx="3.5" fill="url(#bodyGreen)" stroke="#132018" strokeWidth="0.8" />
                      <path d="M4 13C4 11.5 5.5 10.5 8 10.5H86C88.5 10.5 90 11.5 90 13V14.5H4V13Z" fill="#121D17" />
                      <line x1="3" y1="25" x2="91" y2="25" stroke="url(#brassGold)" strokeWidth="1" />

                      {/* Windows */}
                      <rect x="10" y="15" width="10" height="7.5" rx="1.2" fill="url(#warmWindow)" opacity="0.95" />
                      <rect x="25" y="15" width="10" height="7.5" rx="1.2" fill="url(#warmWindow)" opacity="0.95" />
                      <rect x="40" y="15" width="10" height="7.5" rx="1.2" fill="url(#warmWindow)" opacity="0.95" />
                      <rect x="55" y="15" width="10" height="7.5" rx="1.2" fill="url(#warmWindow)" opacity="0.95" />
                      <rect x="70" y="15" width="10" height="7.5" rx="1.2" fill="url(#warmWindow)" opacity="0.95" />

                      {/* Mullions */}
                      <line x1="15" y1="15" x2="15" y2="22.5" stroke="#192B21" strokeWidth="0.8" />
                      <line x1="30" y1="15" x2="30" y2="22.5" stroke="#192B21" strokeWidth="0.8" />
                      <line x1="45" y1="15" x2="45" y2="22.5" stroke="#192B21" strokeWidth="0.8" />
                      <line x1="60" y1="15" x2="60" y2="22.5" stroke="#192B21" strokeWidth="0.8" />
                      <line x1="75" y1="15" x2="75" y2="22.5" stroke="#192B21" strokeWidth="0.8" />

                      {/* Wheels - Properly seated on track */}
                      <circle cx="16" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" />
                      <circle cx="16" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="32" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" />
                      <circle cx="32" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="64" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" />
                      <circle cx="64" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="80" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" />
                      <circle cx="80" cy="38" r="2.2" fill="#D4AF37" />
                    </g>

                    {/* Gangway Coupler 3-2 */}
                    <rect x="91" y="27" width="8" height="4" rx="1" fill="#475569" />
                    <line x1="92" y1="29" x2="98" y2="29" stroke="#94A3B8" strokeWidth="1.5" />

                    {/* ---------------------------------------------------- */}
                    {/* CARRIAGE 2 (The Nilgiri Dining Car)                  */}
                    {/* ---------------------------------------------------- */}
                    <g
                      id="carriage-2"
                      className="cursor-pointer transition-opacity hover:opacity-90"
                      onClick={() => setSelectedCarriage(CARRIAGES[1])}
                    >
                      <rect x="99" y="32" width="90" height="4" rx="1.5" fill="#0D1410" />
                      <rect x="100" y="12" width="88" height="21" rx="3.5" fill="url(#bodyGreen)" stroke="#132018" strokeWidth="0.8" />
                      <path d="M101 13C101 11.5 102.5 10.5 105 10.5H183C185.5 10.5 187 11.5 187 13V14.5H101V13Z" fill="#121D17" />
                      <line x1="100" y1="25" x2="188" y2="25" stroke="url(#brassGold)" strokeWidth="1" />

                      {/* Elegant Dining Windows */}
                      <rect x="107" y="15" width="14" height="7.5" rx="1.2" fill="url(#warmWindow)" opacity="0.95" />
                      <rect x="126" y="15" width="14" height="7.5" rx="1.2" fill="url(#warmWindow)" opacity="0.95" />
                      <rect x="145" y="15" width="14" height="7.5" rx="1.2" fill="url(#warmWindow)" opacity="0.95" />
                      <rect x="164" y="15" width="14" height="7.5" rx="1.2" fill="url(#warmWindow)" opacity="0.95" />

                      {/* Table Lamp Silhouette details */}
                      <circle cx="114" cy="20" r="1.2" fill="#78350F" />
                      <circle cx="133" cy="20" r="1.2" fill="#78350F" />
                      <circle cx="152" cy="20" r="1.2" fill="#78350F" />
                      <circle cx="171" cy="20" r="1.2" fill="#78350F" />

                      {/* Wheels */}
                      <circle cx="113" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" />
                      <circle cx="113" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="129" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" />
                      <circle cx="129" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="161" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" />
                      <circle cx="161" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="177" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" />
                      <circle cx="177" cy="38" r="2.2" fill="#D4AF37" />
                    </g>

                    {/* Gangway Coupler 2-1 */}
                    <rect x="188" y="27" width="8" height="4" rx="1" fill="#475569" />
                    <line x1="189" y1="29" x2="195" y2="29" stroke="#94A3B8" strokeWidth="1.5" />

                    {/* ---------------------------------------------------- */}
                    {/* CARRIAGE 1 (The Malabar Observation Lounge)           */}
                    {/* ---------------------------------------------------- */}
                    <g
                      id="carriage-1"
                      className="cursor-pointer transition-opacity hover:opacity-90"
                      onClick={() => setSelectedCarriage(CARRIAGES[3])}
                    >
                      <rect x="196" y="32" width="90" height="4" rx="1.5" fill="#0D1410" />
                      <rect x="197" y="12" width="88" height="21" rx="3.5" fill="url(#bodyGreen)" stroke="#132018" strokeWidth="0.8" />
                      <path d="M198 13C198 11.5 199.5 10.5 202 10.5H280C282.5 10.5 284 11.5 284 13V14.5H198V13Z" fill="#121D17" />
                      <line x1="197" y1="25" x2="285" y2="25" stroke="url(#brassGold)" strokeWidth="1" />

                      {/* Wide Observation Windows */}
                      <rect x="204" y="14.5" width="16" height="8" rx="1.5" fill="url(#warmWindow)" opacity="0.95" />
                      <rect x="225" y="14.5" width="16" height="8" rx="1.5" fill="url(#warmWindow)" opacity="0.95" />
                      <rect x="246" y="14.5" width="16" height="8" rx="1.5" fill="url(#warmWindow)" opacity="0.95" />
                      <rect x="267" y="14.5" width="10" height="8" rx="1.5" fill="url(#warmWindow)" opacity="0.85" />

                      {/* Mullions */}
                      <line x1="212" y1="14.5" x2="212" y2="22.5" stroke="#192B21" strokeWidth="0.8" />
                      <line x1="233" y1="14.5" x2="233" y2="22.5" stroke="#192B21" strokeWidth="0.8" />
                      <line x1="254" y1="14.5" x2="254" y2="22.5" stroke="#192B21" strokeWidth="0.8" />

                      {/* Wheels */}
                      <circle cx="210" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" />
                      <circle cx="210" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="226" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" />
                      <circle cx="226" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="258" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" />
                      <circle cx="258" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="274" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" />
                      <circle cx="274" cy="38" r="2.2" fill="#D4AF37" />
                    </g>

                    {/* ---------------------------------------------------- */}
                    {/* COAL TENDER                                          */}
                    {/* ---------------------------------------------------- */}
                    <g id="tender">
                      <rect x="293" y="32" width="48" height="5" rx="1.5" fill="#140D09" />
                      <path d="M294 17H340V33H294V17Z" fill="url(#locoDark)" stroke="#1C120B" strokeWidth="0.8" />
                      <path d="M297 17 Q312 12 337 17 Z" fill="#0A0604" />
                      <line x1="294" y1="26" x2="340" y2="26" stroke="url(#brassGold)" strokeWidth="0.8" />

                      {/* Wheels */}
                      <circle cx="305" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" />
                      <circle cx="305" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="321" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" />
                      <circle cx="321" cy="38" r="2.2" fill="#D4AF37" />
                    </g>

                    {/* Coupler Tender to Engine */}
                    <rect x="340" y="28" width="6" height="4" fill="#334155" />

                    {/* ---------------------------------------------------- */}
                    {/* LOCOMOTIVE (Highland Mountain Express 4-6-2)        */}
                    {/* ---------------------------------------------------- */}
                    <g
                      id="locomotive"
                      className="cursor-pointer transition-opacity hover:opacity-90"
                      onClick={() => setSelectedCarriage(CARRIAGES[0])}
                    >
                      <rect x="346" y="32" width="128" height="6" rx="1.5" fill="#140D09" />

                      {/* Driver's Cab */}
                      <path
                        d="M346 11C346 9.5 348 8 350 8H376V33H346V11Z"
                        fill="url(#locoDark)"
                        stroke="#1C120B"
                        strokeWidth="0.8"
                      />
                      <path d="M345 8.5C345 7.5 347 7 350 7H378V9H345V8.5Z" fill="#120A05" />

                      {/* Warm Cab Windows */}
                      <rect x="352" y="12" width="9" height="9" rx="1.2" fill="url(#warmWindow)" opacity="0.95" />
                      <rect x="364" y="12" width="9" height="9" rx="1.2" fill="url(#warmWindow)" opacity="0.95" />

                      {/* Boiler Body */}
                      <path
                        d="M376 13C376 11 378 10 381 10H450C455 10 460 15 460 21V33H376V13Z"
                        fill="url(#locoDark)"
                        stroke="#1C120B"
                        strokeWidth="0.8"
                      />
                      <line x1="394" y1="10" x2="394" y2="33" stroke="url(#brassGold)" strokeWidth="1.5" />
                      <line x1="416" y1="10" x2="416" y2="33" stroke="url(#brassGold)" strokeWidth="1.5" />
                      <line x1="438" y1="10" x2="438" y2="33" stroke="url(#brassGold)" strokeWidth="1.5" />

                      {/* Steam Dome & Sand Dome */}
                      <path d="M402 10C402 7 404.5 5 407 5C409.5 5 412 7 412 10H402Z" fill="url(#brassGold)" />
                      <path d="M426 10C426 8 428 6.5 430 6.5C432 6.5 434 8 434 10H426Z" fill="url(#brassGold)" />

                      {/* Smokebox & Chimney Stack */}
                      <path d="M447 10V4H455V10H447Z" fill="#140D09" />
                      <rect x="445.5" y="2.5" width="11" height="2" rx="1" fill="url(#brassGold)" />

                      {/* Trailing Billowing Steam Clouds */}
                      <circle cx="451" cy="-1" r="2.5" fill="#E8EDEB" opacity="0.55" className="loco-steam steam-puff-1" />
                      <circle cx="445" cy="-5" r="3.8" fill="#E8EDEB" opacity="0.4" className="loco-steam steam-puff-2" />
                      <circle cx="437" cy="-10" r="5.5" fill="#E8EDEB" opacity="0.28" className="loco-steam steam-puff-3" />
                      <circle cx="425" cy="-15" r="7.5" fill="#E8EDEB" opacity="0.16" className="loco-steam steam-puff-4" />

                      {/* Front Wedge Cowcatcher / Pilot */}
                      <path d="M460 27L478 37H460V27Z" fill="#241911" stroke="#120A05" strokeWidth="0.8" />
                      <line x1="462" y1="29" x2="475" y2="37" stroke="#94A3B8" strokeWidth="1" />
                      <line x1="462" y1="32" x2="471" y2="37" stroke="#94A3B8" strokeWidth="1" />

                      {/* Golden Front Headlight Lantern */}
                      <rect x="459" y="17" width="8" height="7" rx="2" fill="#D4AF37" stroke="#1C120B" strokeWidth="0.9" />
                      <circle cx="467" cy="20.5" r="3" fill="#FFFBEB" />
                      <circle cx="467" cy="20.5" r="5.5" fill="#F59E0B" opacity="0.6" />

                      {/* Large Main Driving Wheels */}
                      <circle cx="366" cy="37" r="8.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.5" />
                      <circle cx="366" cy="37" r="3.5" fill="#D4AF37" />
                      <circle cx="388" cy="37" r="8.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.5" />
                      <circle cx="388" cy="37" r="3.5" fill="#D4AF37" />
                      <circle cx="410" cy="37" r="8.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.5" />
                      <circle cx="410" cy="37" r="3.5" fill="#D4AF37" />

                      {/* Side Connecting Rod Linkage */}
                      <line x1="366" y1="37" x2="410" y2="37" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" opacity="0.85" />

                      {/* Front Leading Bogie Wheels */}
                      <circle cx="438" cy="39" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" />
                      <circle cx="438" cy="39" r="2.2" fill="#D4AF37" />
                      <circle cx="454" cy="39" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" />
                      <circle cx="454" cy="39" r="2.2" fill="#D4AF37" />
                    </g>
                  </svg>
                </div>
              </div>

              {/* Layer 5: Atmospheric Mountain Mist & Fog Drifts */}
              <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
                <div className="mist-drift-1 absolute -bottom-4 inset-x-0 h-32 bg-gradient-to-t from-emerald-900/25 via-accent/5 to-transparent blur-md" />
                <div className="mist-drift-2 absolute bottom-6 inset-x-0 h-24 bg-gradient-to-t from-accent/8 via-accent/3 to-transparent blur-lg" />
                <div className="highland-rain-overlay absolute inset-0 opacity-25" />
              </div>

              {/* Layer 6: Foreground Canopy Silhouette */}
              <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                <svg
                  className="absolute -top-4 -left-6 h-48 w-48 text-[#070E0A] opacity-90 blur-[0.6px]"
                  viewBox="0 0 200 200"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M0,0 C40,20 70,50 80,90 C85,110 75,130 95,150 C75,140 65,120 50,110 C35,100 20,110 0,120 Z" />
                  <path d="M0,0 C60,10 110,40 130,80 C110,75 90,80 80,90 C60,50 30,30 0,0 Z" opacity="0.8" />
                  <path d="M40,0 C90,30 130,70 145,120 C125,115 110,105 95,110 C85,70 60,35 40,0 Z" opacity="0.6" />
                </svg>

                <svg
                  className="absolute -bottom-4 -right-6 h-40 w-48 text-[#070E0A] opacity-85 blur-[0.6px]"
                  viewBox="0 0 200 160"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M200,160 L80,160 C100,130 120,110 150,95 C130,105 115,120 100,135 C125,100 155,75 180,60 C165,75 155,90 145,105 C175,70 200,50 200,40 Z" />
                </svg>

                <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
              </div>
            </div>

            {/* Carriage Discovery Deck - Interactive Luxury Consist Selector */}
            <div className="mt-8">
              <div className="flex items-center justify-between px-2 mb-4">
                <div>
                  <h3 className="font-lora text-xl text-[#E8EDEB] sm:text-2xl">
                    The Highland Consist
                  </h3>
                  <p className="text-xs text-accent/65 mt-0.5">
                    Select a historic carriage to discover bespoke amenities & craftsmanship
                  </p>
                </div>
                <span className="text-xs text-accent/50 uppercase tracking-widest hidden sm:inline">
                  Click to Inspect
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {CARRIAGES.map((car) => {
                  const isSelected = selectedCarriage?.id === car.id;
                  return (
                    <button
                      key={car.id}
                      type="button"
                      onClick={() => setSelectedCarriage(car)}
                      className={`group relative flex flex-col justify-between text-left p-5 rounded-2xl border transition-all duration-300 cursor-pointer backdrop-blur-md ${isSelected
                        ? "border-amber-400/50 bg-white/10 shadow-[0_12px_28px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/30 -translate-y-1"
                        : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/[0.08] hover:-translate-y-0.5"
                        }`}
                      aria-label={`Inspect ${car.title}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
                            {car.badge}
                          </span>
                          <span className="text-[10px] text-accent/40 font-mono">
                            {car.builtYear}
                          </span>
                        </div>
                        <h4 className="font-lora text-lg text-white group-hover:text-amber-200 transition-colors">
                          {car.title}
                        </h4>
                        <p className="text-xs text-accent/70 mt-1 line-clamp-2 leading-relaxed">
                          {car.tagline}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-medium text-amber-400/90 group-hover:text-amber-300">
                        <span>Explore Carriage</span>
                        <span className="transition-transform group-hover:translate-x-1">→</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scene Footer Metadata & Story Cue */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 px-2 text-xs tracking-wider text-accent/50 uppercase">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent/60" />
                <span>The Highland Mountain Express • Coorg Ridge Passage</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-accent/45">
                <span>Elevation: 1,120m</span>
                <span className="hidden sm:inline">•</span>
                <span>Active Heritage Line</span>
                <span className="hidden sm:inline">•</span>
                <span>Exclusive to Estate Guests</span>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Carriage Detailed Inspection Modal (Luxury Editorial Drawer) */}
      {selectedCarriage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6 backdrop-blur-md transition-opacity"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-carriage-title"
        >
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-400/30 bg-[#122018] p-6 sm:p-8 text-[#E8EDEB] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedCarriage(null)}
              aria-label="Close carriage details"
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl leading-none text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              &times;
            </button>

            {/* Header Badge */}
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300/85">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>{selectedCarriage.badge}</span>
              <span className="text-white/40">•</span>
              <span className="text-white/60">{selectedCarriage.builtYear}</span>
            </div>

            <h3 id="modal-carriage-title" className="mt-3 font-lora text-3xl text-white sm:text-4xl">
              {selectedCarriage.title}
            </h3>
            <p className="mt-1 text-xs font-medium text-amber-200/70 uppercase tracking-wider">
              {selectedCarriage.type} • Capacity: {selectedCarriage.capacity}
            </p>

            <p className="mt-5 text-sm leading-relaxed text-[#E8EDEB]/80 sm:text-base">
              {selectedCarriage.description}
            </p>

            {/* Craft & Amenities Columns */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-white/10">
              <div>
                <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">
                  Bespoke Craftsmanship
                </h4>
                <ul className="space-y-1.5 text-xs text-white/75">
                  {selectedCarriage.craftDetails.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400">✦</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">
                  On-Board Amenities
                </h4>
                <ul className="space-y-1.5 text-xs text-white/75">
                  {selectedCarriage.amenities.map((amenity, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span>{amenity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-white/10">
              <Link
                href={`mailto:tawsifk35@gmail.com?subject=${encodeURIComponent(
                  `Heritage Journey Inquiry: ${selectedCarriage.title}`
                )}`}
                className="w-full sm:w-auto flex-1 rounded-full bg-[#4A3320] py-3 text-center text-sm font-medium text-white transition-all hover:bg-[#4A3320]/90 shadow-md"
              >
                Inquire for Private Charter or Stay
              </Link>
              <button
                type="button"
                onClick={() => setSelectedCarriage(null)}
                className="w-full sm:w-auto rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scoped Keyframe Motion */}
      <style jsx>{`
        /* Stately, smooth continuous loop across the mountain viaduct */
        .highland-express-mover {
          animation-name: expressTraverse;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }

        .highland-express-mover.train-paused {
          animation-play-state: paused !important;
        }

        @keyframes expressTraverse {
          0% {
            transform: translate3d(-520px, 0, 0);
          }
          100% {
            transform: translate3d(calc(100% + 520px), 0, 0);
          }
        }

        /* Locomotive Steam Plumes Dissolving into Mountain Air */
        .loco-steam {
          animation: steamPlume 2.2s ease-out infinite;
        }
        .steam-puff-1 {
          animation-delay: 0s;
        }
        .steam-puff-2 {
          animation-delay: 0.5s;
        }
        .steam-puff-3 {
          animation-delay: 1s;
        }
        .steam-puff-4 {
          animation-delay: 1.5s;
        }

        @keyframes steamPlume {
          0% {
            opacity: 0.6;
            transform: translate3d(0, 0, 0) scale(0.8);
          }
          50% {
            opacity: 0.35;
            transform: translate3d(-24px, -15px, 0) scale(1.6);
          }
          100% {
            opacity: 0;
            transform: translate3d(-55px, -28px, 0) scale(2.6);
          }
        }

        /* Repeating Railway Sleepers across Viaduct */
        .viaduct-sleepers {
          background-image: repeating-linear-gradient(
            90deg,
            rgba(232, 237, 235, 0.2) 0px,
            rgba(232, 237, 235, 0.2) 4px,
            transparent 4px,
            transparent 19px
          );
        }

        /* Rolling Mist Banks across Viaduct Base */
        .mist-drift-1 {
          animation: mistMotion 28s ease-in-out infinite alternate;
        }
        .mist-drift-2 {
          animation: mistMotion 38s ease-in-out infinite alternate-reverse;
        }

        @keyframes mistMotion {
          0% {
            transform: translate3d(-40px, 0, 0);
          }
          100% {
            transform: translate3d(40px, 0, 0);
          }
        }

        /* Atmospheric Night Sky Cloud Drift */
        .sky-cloud-drift {
          background: radial-gradient(
            ellipse 80% 50% at 50% 30%,
            rgba(232, 237, 235, 0.08) 0%,
            rgba(232, 237, 235, 0) 70%
          );
          animation: cloudSway 45s ease-in-out infinite alternate;
        }

        @keyframes cloudSway {
          0% {
            transform: translate3d(-30px, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(30px, 0, 0) scale(1.08);
          }
        }

        /* Subtle Highland Rain Streaks */
        .highland-rain-overlay {
          background-image: repeating-linear-gradient(
            -18deg,
            rgba(205, 216, 224, 0.45) 0px,
            rgba(205, 216, 224, 0.45) 1px,
            transparent 1px,
            transparent 36px
          );
          animation: rainStreak 1s linear infinite;
        }

        @keyframes rainStreak {
          0% {
            transform: translate3d(0, -36px, 0);
          }
          100% {
            transform: translate3d(-12px, 36px, 0);
          }
        }

        /* Subtle Distant Stars */
        .mountain-stars {
          background-image: radial-gradient(1px 1px at 20px 30px, #E8EDEB, transparent),
            radial-gradient(1px 1px at 120px 60px, rgba(232, 237, 235, 0.8), transparent),
            radial-gradient(1.5px 1.5px at 280px 40px, #FEF08A, transparent),
            radial-gradient(1px 1px at 450px 80px, #E8EDEB, transparent),
            radial-gradient(1px 1px at 620px 25px, rgba(232, 237, 235, 0.7), transparent),
            radial-gradient(1.5px 1.5px at 810px 50px, #E8EDEB, transparent),
            radial-gradient(1px 1px at 980px 35px, #FEF08A, transparent),
            radial-gradient(1px 1px at 1150px 75px, #E8EDEB, transparent);
          background-repeat: repeat-x;
          background-size: 1200px 150px;
        }

        /* ======================================================== */
        /* ACCESSIBILITY: PREFERS-REDUCED-MOTION                    */
        /* ======================================================== */
        @media (prefers-reduced-motion: reduce) {
          .highland-express-mover {
            animation: none !important;
            transform: translate3d(calc(50% - 245px), 0, 0) !important;
          }
          .loco-steam,
          .mist-drift-1,
          .mist-drift-2,
          .sky-cloud-drift,
          .highland-rain-overlay {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
