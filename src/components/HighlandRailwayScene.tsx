"use client";

import React, { useRef, useState, useEffect } from "react";

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
      className={`transition-all duration-1000 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function HighlandRailwayScene() {
  return (
    <section
      id="journey"
      className="relative w-full overflow-hidden bg-gradient-to-b from-secondary via-[#14231A] to-dark-accent py-28 sm:py-36 text-[#E8EDEB]"
      aria-label="The Highland Journey - Cinematic Railway Experience"
    >
      {/* Top & Bottom gradient feathering for seamless blending with neighboring sections */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-secondary to-transparent z-20" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-dark-accent to-transparent z-20" />

      {/* Atmospheric background ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-950/20 blur-[120px]" />
      <div className="pointer-events-none absolute right-10 top-1/2 h-80 w-80 rounded-full bg-amber-600/5 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Minimal cinematic storytelling header */}
        <FadeIn>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1 text-xs font-medium uppercase tracking-widest text-accent/60 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              The Highland Journey
            </span>
            <h2 className="mt-5 font-lora text-4xl leading-tight text-accent sm:text-5xl md:text-6xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
              Where the Mist Carries You Farther
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-accent/65 sm:text-lg">
              A vintage mountain express winding through ancient shola canopies, tea valleys,
              and the rain-washed stillness of the Western Ghats.
            </p>
          </div>
        </FadeIn>

        {/* Cinematic Panoramic Stage */}
        <FadeIn delay={150}>
          <div className="relative mx-auto mt-14 sm:mt-16 w-full">
            {/* The Scenic Canvas Container */}
            <div className="relative h-[360px] sm:h-[440px] md:h-[490px] w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#09130D] via-[#0E1C14] to-[#0A130E] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85)]">
              {/* Sky Background & Veiled Mountain Moon */}
              <div className="pointer-events-none absolute inset-0">
                {/* Soft Veiled Moon Glow */}
                <div className="absolute left-[38%] top-8 h-28 w-28 rounded-full bg-amber-100/10 blur-2xl" />
                <div className="absolute left-[38%] top-12 h-16 w-16 rounded-full bg-gradient-to-br from-amber-50/20 via-amber-100/10 to-transparent blur-md" />

                {/* Stars / Atmospheric Particulate Shimmer */}
                <div className="mountain-stars absolute inset-0 opacity-40" />

                {/* Overcast Cloud Drift */}
                <div className="sky-cloud-drift absolute inset-0 opacity-25" />
              </div>

              {/* Layer 1: Far Mountain Silhouettes */}
              <svg
                className="pointer-events-none absolute bottom-0 left-0 w-full h-[65%] text-[#091510] opacity-80"
                viewBox="0 0 1440 280"
                preserveAspectRatio="none"
                fill="currentColor"
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
              >
                {/* Layered hill shapes with tree silhouettes */}
                <path d="M0,240 L0,110 Q120,60 260,85 T540,55 T820,95 T1120,50 T1440,80 L1440,240 Z" />
              </svg>

              {/* Distant Warm Estate Cabin Lanterns in the Forest */}
              <div className="pointer-events-none absolute bottom-[38%] left-[18%] h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B] animate-pulse" />
              <div className="pointer-events-none absolute bottom-[42%] left-[48%] h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_10px_#F59E0B] animate-pulse" style={{ animationDelay: "1.2s" }} />
              <div className="pointer-events-none absolute bottom-[35%] left-[78%] h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B] animate-pulse" style={{ animationDelay: "2.4s" }} />

              {/* Layer 3: The Ancient Stone Mountain Viaduct */}
              <div className="pointer-events-none absolute bottom-0 inset-x-0 h-32 sm:h-36">
                {/* Viaduct Masonry Structure */}
                <svg
                  className="w-full h-full text-[#14231B] drop-shadow-[0_-4px_16px_rgba(0,0,0,0.6)]"
                  viewBox="0 0 1440 140"
                  preserveAspectRatio="none"
                  fill="currentColor"
                >
                  {/* Heavy Viaduct Arch Structure */}
                  <path d="M0,140 L0,22 H1440 V140 H1410 V65 Q1355,10 1300,65 V140 H1250 V65 Q1195,10 1140,65 V140 H1090 V65 Q1035,10 980,65 V140 H930 V65 Q875,10 820,65 V140 H770 V65 Q715,10 660,65 V140 H610 V65 Q555,10 500,65 V140 H450 V65 Q395,10 340,65 V140 H290 V65 Q235,10 180,65 V140 H130 V65 Q75,10 20,65 V140 Z" />
                  {/* Pier cornice & trim line */}
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
                <div className="highland-express-mover absolute bottom-0 left-0 flex items-end">
                  {/* Forward Volumetric Headlight Light Cone */}
                  <div className="pointer-events-none absolute -right-52 bottom-1.5 h-16 w-56 bg-gradient-to-r from-amber-300/60 via-amber-200/20 to-transparent blur-[6px] rounded-r-full" />
                  <div className="pointer-events-none absolute -right-44 bottom-2.5 h-8 w-48 bg-gradient-to-r from-amber-100/80 via-amber-200/30 to-transparent blur-[2px] rounded-r-full" />

                  {/* SVG Highland Mountain Express (Locomotive + Tender + 3 Carriages) */}
                  <svg
                    className="h-14 w-[430px] sm:h-16 sm:w-[490px] drop-shadow-[0_8px_20px_rgba(0,0,0,0.85)]"
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
                    <g id="carriage-3">
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
                      {/* Window mullions & passenger silhouettes */}
                      <line x1="15" y1="15" x2="15" y2="22.5" stroke="#192B21" strokeWidth="0.8" />
                      <line x1="30" y1="15" x2="30" y2="22.5" stroke="#192B21" strokeWidth="0.8" />
                      <line x1="45" y1="15" x2="45" y2="22.5" stroke="#192B21" strokeWidth="0.8" />
                      <line x1="60" y1="15" x2="60" y2="22.5" stroke="#192B21" strokeWidth="0.8" />
                      <line x1="75" y1="15" x2="75" y2="22.5" stroke="#192B21" strokeWidth="0.8" />
                      {/* Wheels */}
                      <circle cx="16" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" className="wheel-spin" />
                      <circle cx="16" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="32" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" className="wheel-spin" />
                      <circle cx="32" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="64" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" className="wheel-spin" />
                      <circle cx="64" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="80" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" className="wheel-spin" />
                      <circle cx="80" cy="38" r="2.2" fill="#D4AF37" />
                    </g>

                    {/* Gangway Coupler 3-2 */}
                    <rect x="91" y="27" width="8" height="4" rx="1" fill="#475569" />
                    <line x1="92" y1="29" x2="98" y2="29" stroke="#94A3B8" strokeWidth="1.5" />

                    {/* ---------------------------------------------------- */}
                    {/* CARRIAGE 2 (The Nilgiri Dining Car)                  */}
                    {/* ---------------------------------------------------- */}
                    <g id="carriage-2">
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
                      <circle cx="113" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" className="wheel-spin" />
                      <circle cx="113" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="129" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" className="wheel-spin" />
                      <circle cx="129" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="161" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" className="wheel-spin" />
                      <circle cx="161" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="177" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" className="wheel-spin" />
                      <circle cx="177" cy="38" r="2.2" fill="#D4AF37" />
                    </g>

                    {/* Gangway Coupler 2-1 */}
                    <rect x="188" y="27" width="8" height="4" rx="1" fill="#475569" />
                    <line x1="189" y1="29" x2="195" y2="29" stroke="#94A3B8" strokeWidth="1.5" />

                    {/* ---------------------------------------------------- */}
                    {/* CARRIAGE 1 (The Malabar Observation Lounge)           */}
                    {/* ---------------------------------------------------- */}
                    <g id="carriage-1">
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
                      <circle cx="210" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" className="wheel-spin" />
                      <circle cx="210" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="226" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" className="wheel-spin" />
                      <circle cx="226" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="258" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" className="wheel-spin" />
                      <circle cx="258" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="274" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" className="wheel-spin" />
                      <circle cx="274" cy="38" r="2.2" fill="#D4AF37" />
                    </g>

                    {/* Coupler Carriage to Tender */}
                    <rect x="285" y="27" width="8" height="4" rx="1" fill="#475569" />
                    <line x1="286" y1="29" x2="292" y2="29" stroke="#94A3B8" strokeWidth="1.5" />

                    {/* ---------------------------------------------------- */}
                    {/* COAL TENDER                                          */}
                    {/* ---------------------------------------------------- */}
                    <g id="tender">
                      <rect x="293" y="32" width="48" height="5" rx="1.5" fill="#140D09" />
                      <path d="M294 17H340V33H294V17Z" fill="url(#locoDark)" stroke="#1C120B" strokeWidth="0.8" />
                      {/* Coal Mound */}
                      <path d="M297 17 Q312 12 337 17 Z" fill="#0A0604" />
                      <line x1="294" y1="26" x2="340" y2="26" stroke="url(#brassGold)" strokeWidth="0.8" />
                      {/* Wheels */}
                      <circle cx="305" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" className="wheel-spin" />
                      <circle cx="305" cy="38" r="2.2" fill="#D4AF37" />
                      <circle cx="321" cy="38" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" className="wheel-spin" />
                      <circle cx="321" cy="38" r="2.2" fill="#D4AF37" />
                    </g>

                    {/* Coupler Tender to Engine */}
                    <rect x="340" y="28" width="6" height="4" fill="#334155" />

                    {/* ---------------------------------------------------- */}
                    {/* LOCOMOTIVE (Highland Mountain Express 4-6-2)        */}
                    {/* ---------------------------------------------------- */}
                    <g id="locomotive">
                      {/* Heavy Chassis Frame */}
                      <rect x="346" y="32" width="128" height="6" rx="1.5" fill="#140D09" />

                      {/* Driver's Cab */}
                      <path
                        d="M346 11C346 9.5 348 8 350 8H376V33H346V11Z"
                        fill="url(#locoDark)"
                        stroke="#1C120B"
                        strokeWidth="0.8"
                      />
                      {/* Curved Cab Roof */}
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
                      {/* Polished Brass Boiler Straps */}
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

                      {/* Large Main Driving Wheels (6-Coupled Engine) */}
                      {/* Driver 1 */}
                      <circle cx="366" cy="37" r="8.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.5" className="wheel-spin" />
                      <circle cx="366" cy="37" r="3.5" fill="#D4AF37" />
                      {/* Driver 2 */}
                      <circle cx="388" cy="37" r="8.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.5" className="wheel-spin" />
                      <circle cx="388" cy="37" r="3.5" fill="#D4AF37" />
                      {/* Driver 3 */}
                      <circle cx="410" cy="37" r="8.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.5" className="wheel-spin" />
                      <circle cx="410" cy="37" r="3.5" fill="#D4AF37" />

                      {/* Side Connecting Rod Linkage */}
                      <line x1="366" y1="37" x2="410" y2="37" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" opacity="0.85" />

                      {/* Front Leading Bogie Wheels */}
                      <circle cx="438" cy="39" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" className="wheel-spin" />
                      <circle cx="438" cy="39" r="2.2" fill="#D4AF37" />
                      <circle cx="454" cy="39" r="5.5" fill="url(#steelWheel)" stroke="#0F172A" strokeWidth="1.2" className="wheel-spin" />
                      <circle cx="454" cy="39" r="2.2" fill="#D4AF37" />
                    </g>
                  </svg>
                </div>
              </div>

              {/* Layer 5: Atmospheric Mountain Mist & Fog Drifts */}
              <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
                {/* Rolling low-level gorge mist */}
                <div className="mist-drift-1 absolute -bottom-4 inset-x-0 h-32 bg-gradient-to-t from-emerald-900/25 via-accent/5 to-transparent blur-md" />
                <div className="mist-drift-2 absolute bottom-6 inset-x-0 h-24 bg-gradient-to-t from-accent/8 via-accent/3 to-transparent blur-lg" />
                {/* Highland Rain Streaks (Ultra-subtle) */}
                <div className="highland-rain-overlay absolute inset-0 opacity-25" />
              </div>

              {/* Layer 6: Foreground Canopy Silhouette (Photographic Depth of Field) */}
              <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                {/* Left Tree Canopy Branch Silhouette */}
                <svg
                  className="absolute -top-4 -left-6 h-48 w-48 text-[#070E0A] opacity-90 blur-[0.6px]"
                  viewBox="0 0 200 200"
                  fill="currentColor"
                >
                  <path d="M0,0 C40,20 70,50 80,90 C85,110 75,130 95,150 C75,140 65,120 50,110 C35,100 20,110 0,120 Z" />
                  <path d="M0,0 C60,10 110,40 130,80 C110,75 90,80 80,90 C60,50 30,30 0,0 Z" opacity="0.8" />
                  <path d="M40,0 C90,30 130,70 145,120 C125,115 110,105 95,110 C85,70 60,35 40,0 Z" opacity="0.6" />
                </svg>

                {/* Right Bottom Shola Fern & Ridge Silhouette */}
                <svg
                  className="absolute -bottom-4 -right-6 h-44 w-52 text-[#060D09] opacity-95 blur-[0.4px]"
                  viewBox="0 0 200 160"
                  fill="currentColor"
                >
                  <path d="M200,160 L60,160 C85,130 115,110 145,95 C125,105 110,120 90,135 C120,100 150,75 180,60 C165,75 155,90 145,105 C175,70 200,50 200,40 Z" />
                </svg>

                {/* Cinematic Vignette Framing */}
                <div className="absolute inset-0 bg-radial-vignette opacity-80" />
                <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
              </div>
            </div>

            {/* Scene Footer Metadata & Story Cue */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 px-3 text-xs tracking-wider text-accent/50 uppercase">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent/40" />
                <span>The Highland Mountain Express • Coorg Ridge Passage</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-accent/40">
                <span>Elevation: 1,000m</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">Active Route</span>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Scoped CSS Keyframe Motion */}
      <style jsx>{`
        /* Stately, smooth 32-second continuous loop across the mountain viaduct */
        .highland-express-mover {
          animation: expressTraverse 32s linear infinite;
          will-change: transform;
        }

        @keyframes expressTraverse {
          0% {
            transform: translate3d(-520px, 0, 0);
          }
          100% {
            transform: translate3d(calc(100% + 520px), 0, 0);
          }
        }

        /* Continuous Wheel Rotation */
        .wheel-spin {
          transform-origin: center;
          animation: wheelRotate 1.4s linear infinite;
        }

        @keyframes wheelRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Locomotive Steam Plumes Dissolving into Mountain Air */
        .loco-steam {
          animation: steamPlume 2.2s ease-out infinite;
        }
        .steam-puff-1 { animation-delay: 0s; }
        .steam-puff-2 { animation-delay: 0.5s; }
        .steam-puff-3 { animation-delay: 1.0s; }
        .steam-puff-4 { animation-delay: 1.5s; }

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
          .wheel-spin,
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
