"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Phase, WeatherOverride } from "@/lib/hero-environment";

// "live" follows the real Coorg clock / weather; anything else is the visitor's choice.
export type TimeChoice = "live" | Phase;
export type WeatherChoice = "live" | WeatherOverride;

export const DEFAULT_TIME: TimeChoice = "dusk";
export const DEFAULT_WEATHER: WeatherChoice = "live";

const TIME_OPTIONS: { id: TimeChoice; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "dawn", label: "Dawn" },
  { id: "day", label: "Day" },
  { id: "dusk", label: "Dusk" },
  { id: "night", label: "Night" },
];

const WEATHER_OPTIONS: { id: WeatherChoice; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "clear", label: "Clear" },
  { id: "cloud", label: "Cloudy" },
  { id: "mist", label: "Mist" },
  { id: "rain", label: "Rain" },
  { id: "storm", label: "Storm" },
];

interface SceneSettingsProps {
  time: TimeChoice;
  weather: WeatherChoice;
  onTimeChange: (time: TimeChoice) => void;
  onWeatherChange: (weather: WeatherChoice) => void;
  /** What it is really like in Coorg right now, e.g. "7:42 PM · Light rain · 23°C". */
  liveSummary: string;
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-8 cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        selected
          ? "border-amber-300/45 bg-amber-300/20 text-amber-100"
          : "border-white/10 bg-white/5 text-white/75 hover:border-white/25 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * One small gear button. It opens a compact panel where the visitor can pick the
 * time of day and the weather of the hero scene; "Live" follows the real thing.
 */
export default function SceneSettings({
  time,
  weather,
  onTimeChange,
  onWeatherChange,
  liveSummary,
}: SceneSettingsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Close on Escape (returning focus to the button) or a click outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const isDefault = time === DEFAULT_TIME && weather === DEFAULT_WEATHER;

  return (
    <div ref={rootRef} className="pointer-events-auto relative">
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label="Scene settings"
          className="absolute bottom-full right-0 mb-3 w-[min(19rem,calc(100vw-7.5rem))] rounded-2xl border border-white/10 bg-[rgba(20,14,10,0.78)] p-4 text-[#E8EDEB] shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Scene settings</p>
              <p className="mt-0.5 text-xs text-white/60">Now in Coorg: {liveSummary}</p>
            </div>
            <button
              type="button"
              aria-label="Close settings"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              className="-mr-1 -mt-1 grid h-8 w-8 cursor-pointer place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <fieldset className="mb-3">
            <legend className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">Time of day</legend>
            <div className="flex flex-wrap gap-1.5">
              {TIME_OPTIONS.map(({ id, label }) => (
                <Chip key={id} selected={time === id} onClick={() => onTimeChange(id)}>
                  {label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">Weather</legend>
            <div className="flex flex-wrap gap-1.5">
              {WEATHER_OPTIONS.map(({ id, label }) => (
                <Chip key={id} selected={weather === id} onClick={() => onWeatherChange(id)}>
                  {label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            disabled={isDefault}
            onClick={() => {
              onTimeChange(DEFAULT_TIME);
              onWeatherChange(DEFAULT_WEATHER);
            }}
            className="mt-3 cursor-pointer text-xs text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline disabled:cursor-default disabled:opacity-40 disabled:hover:no-underline"
          >
            Reset to dusk
          </button>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        aria-label="Scene settings"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`grid h-10 w-10 cursor-pointer place-items-center rounded-full border backdrop-blur-md transition-colors ${
          open
            ? "border-amber-300/45 bg-amber-300/20 text-amber-100"
            : "border-white/15 bg-[rgba(20,14,10,0.55)] text-white/85 hover:border-white/30 hover:text-white"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>
  );
}
