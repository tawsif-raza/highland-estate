"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import PanoramaViewer from "./PanoramaViewer";

import { TOUR_SPOTS, type PanoramaAsset } from "@/lib/panorama-data";

/* ------------------------------------------------------------------ */
/*  Fade-in on scroll                                                 */
/* ------------------------------------------------------------------ */

function FadeIn({
  children,
  className,
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
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className ?? ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tour Card                                                         */
/* ------------------------------------------------------------------ */

function TourCard({
  spot,
  onLaunch,
  delay = 0,
}: {
  spot: PanoramaAsset;
  onLaunch: () => void;
  delay?: number;
}) {
  return (
    <FadeIn delay={delay}>
      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {/* Thumbnail */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={spot.thumbnail}
            alt={spot.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Badge */}
          {spot.badge && (
            <span className="absolute left-3 top-3 rounded-full bg-accent/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent backdrop-blur-sm">
              {spot.badge}
            </span>
          )}

          {/* 360° indicator */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-4 w-4 text-white/80"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3c-4.97 0-9 3.13-9 7s4.03 7 9 7 9-3.13 9-7-4.03-7-9-7z"
              />
              <path strokeLinecap="round" d="M12 3v14M3 10h18" />
              <path
                strokeLinecap="round"
                d="M5.5 6.5c1.8 1.5 4 2.5 6.5 2.5s4.7-1 6.5-2.5"
              />
            </svg>
            <span className="text-xs font-medium text-white/80">360°</span>
          </div>
        </div>

        {/* Info + launch button */}
        <div className="p-5">
          <h3 className="font-lora text-lg text-white">{spot.title}</h3>
          <p className="mt-1 text-xs text-accent/60">{spot.subtitle}</p>

          <button
            type="button"
            onClick={onLaunch}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-accent/20 bg-accent/5 py-2.5 text-sm font-medium text-accent transition-all hover:border-accent/40 hover:bg-accent/10"
          >
            <span>🔭</span>
            <span>Launch Virtual Tour</span>
          </button>
        </div>
      </div>
    </FadeIn>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Section                                                      */
/* ------------------------------------------------------------------ */

export default function VirtualTourSection() {
  const [activeSpot, setActiveSpot] = useState<PanoramaAsset | null>(null);

  return (
    <>
      <section id="virtual-tours" className="bg-secondary py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="text-center">
              <span className="rounded-full border border-accent/20 bg-accent/5 px-4 py-1 text-xs font-medium uppercase tracking-widest text-accent/50">
                Immersive Experience
              </span>
              <h2 className="mt-5 font-lora text-4xl text-accent sm:text-5xl">
                360° Virtual Property Tours
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-accent/60">
                Step inside our rooms and estate spaces before you arrive.
                Drag to look around, scroll to zoom — experience the estate
                from anywhere.
              </p>
            </div>
          </FadeIn>

          {/* Tour grid */}
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {TOUR_SPOTS.map((spot, i) => (
              <TourCard
                key={spot.id}
                spot={spot}
                onLaunch={() => setActiveSpot(spot)}
                delay={i * 80}
              />
            ))}
          </div>

          {/* Instruction row */}
          <FadeIn delay={400}>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-accent/40">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M10 3a1 1 0 01.894.553l1.789 3.626 3.998.581a1 1 0 01.554 1.706l-2.893 2.819.683 3.983a1 1 0 01-1.45 1.054L10 15.347l-3.575 1.879a1 1 0 01-1.45-1.054l.683-3.983-2.893-2.819a1 1 0 01.554-1.706l3.998-.581 1.789-3.626A1 1 0 0110 3z" />
                </svg>
                Click any card to launch the 360° tour
              </span>
              <span className="flex items-center gap-1.5">
                🖱️ Drag to look around
              </span>
              <span className="flex items-center gap-1.5">
                🔍 Scroll to zoom
              </span>
              <span className="flex items-center gap-1.5">
                ⎋ Press Escape to close
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Panorama viewer modal — keyed on spot id so the component
          fully unmounts/remounts between openings, resetting view state. */}
      <PanoramaViewer
        key={activeSpot?.id ?? "closed"}
        src={activeSpot?.panorama ?? ""}
        previewSrc={activeSpot?.preview}
        title={activeSpot?.title ?? ""}
        isOpen={activeSpot !== null}
        onClose={() => setActiveSpot(null)}
      />
    </>
  );
}
