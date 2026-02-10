import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { CardSpotlight } from "./ui/card-spotlight";
import type { TelemetryData } from "../services/flightDataService";

interface CockpitDisplayProps {
  telemetry: TelemetryData | null;
  connected: boolean;
  className?: string;
}

/**
 * Glassmorphism Cockpit Display
 *
 * A frosted-glass HUD-style instrument panel showing real-time
 * flight data. Uses Aceternity UI CardSpotlight for hover effects,
 * Framer Motion for smooth value transitions.
 */
export const CockpitDisplay: React.FC<CockpitDisplayProps> = ({
  telemetry,
  connected,
  className,
}) => {
  const instruments = useMemo(() => {
    if (!telemetry) return null;
    return [
      {
        label: "ALT",
        value: Math.round(telemetry.altitude).toLocaleString(),
        unit: "FT",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
        ),
        color: "text-cyan-400",
        glowColor: "rgba(34,211,238,0.15)",
      },
      {
        label: "IAS",
        value: Math.round(telemetry.ias).toString(),
        unit: "KT",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
        color: "text-green-400",
        glowColor: "rgba(74,222,128,0.15)",
      },
      {
        label: "HDG",
        value: Math.round(telemetry.heading).toString().padStart(3, "0"),
        unit: "°",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
          </svg>
        ),
        color: "text-amber-400",
        glowColor: "rgba(251,191,36,0.15)",
      },
      {
        label: "GS",
        value: Math.round(telemetry.ground_speed).toString(),
        unit: "KT",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
        ),
        color: "text-purple-400",
        glowColor: "rgba(192,132,252,0.15)",
      },
      {
        label: "VS",
        value: (telemetry.vertical_speed >= 0 ? "+" : "") + Math.round(telemetry.vertical_speed).toString(),
        unit: "FPM",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ),
        color: telemetry.vertical_speed > 100 ? "text-green-400" : telemetry.vertical_speed < -100 ? "text-red-400" : "text-gray-400",
        glowColor: telemetry.vertical_speed > 100 ? "rgba(74,222,128,0.15)" : telemetry.vertical_speed < -100 ? "rgba(248,113,113,0.15)" : "rgba(156,163,175,0.1)",
      },
      {
        label: "FUEL",
        value: telemetry.fuel_kg.toFixed(0),
        unit: "KG",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        ),
        color: telemetry.fuel_kg > 20 ? "text-blue-400" : "text-orange-400",
        glowColor: "rgba(96,165,250,0.15)",
      },
    ];
  }, [telemetry]);

  const phaseColor = useMemo(() => {
    const phase = telemetry?.flight_phase?.toUpperCase();
    switch (phase) {
      case "CRUISE": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "CLIMB": return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      case "DESCENT": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "APPROACH": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "TAKEOFF_ROLL": case "TAKEOFF": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "TAXI": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "PARKED": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default: return "bg-white/10 text-white/60 border-white/10";
    }
  }, [telemetry?.flight_phase]);

  return (
    <div className={cn("relative", className)}>
      {/* Main cockpit panel */}
      <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-br from-black/60 via-gray-900/50 to-black/60 backdrop-blur-2xl overflow-hidden shadow-2xl">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Header bar */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            {/* Connection indicator */}
            <motion.div
              className={cn(
                "w-2 h-2 rounded-full",
                connected ? "bg-emerald-400" : "bg-red-400"
              )}
              animate={{
                scale: connected ? [1, 1.3, 1] : 1,
                opacity: connected ? [1, 0.6, 1] : 0.5,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-white/40">
              {telemetry?.callsign ?? "NO SIGNAL"}
            </span>
            {telemetry?.aircraft_icao && (
              <span className="text-xs font-mono text-white/20">
                {telemetry.aircraft_icao}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Flight phase badge */}
            <AnimatePresence mode="wait">
              {telemetry?.flight_phase && (
                <motion.span
                  key={telemetry.flight_phase}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border",
                    phaseColor
                  )}
                >
                  {telemetry.flight_phase.replace("_", " ")}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Route */}
            {telemetry?.departure_icao && telemetry?.arrival_icao && (
              <span className="text-xs font-mono text-white/30">
                {telemetry.departure_icao}
                <span className="text-jal-red mx-1">→</span>
                {telemetry.arrival_icao}
              </span>
            )}

            {/* Simulator badge */}
            {telemetry?.simulator && (
              <span className="text-[10px] font-mono text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
                {telemetry.simulator}
              </span>
            )}
          </div>
        </div>

        {/* Instrument grid */}
        <div className="relative p-6">
          {!telemetry ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/30">
              <motion.svg
                className="w-12 h-12 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </motion.svg>
              <span className="text-sm font-mono tracking-wider">
                AWAITING TELEMETRY
              </span>
              <span className="text-xs text-white/20 mt-1">
                Connect feeder client to begin tracking
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {instruments?.map((inst, idx) => (
                <CardSpotlight
                  key={inst.label}
                  color={inst.glowColor}
                  radius={200}
                  className="!bg-white/[0.03] !border-white/[0.06]"
                >
                  <motion.div
                    className="p-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30">
                        {inst.label}
                      </span>
                      <span className={cn("opacity-50", inst.color)}>
                        {inst.icon}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <motion.span
                        key={inst.value}
                        className={cn("text-2xl font-mono font-semibold tabular-nums", inst.color)}
                        initial={{ opacity: 0.5, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.15 }}
                      >
                        {inst.value}
                      </motion.span>
                      <span className="text-[10px] font-mono text-white/20 uppercase">
                        {inst.unit}
                      </span>
                    </div>
                  </motion.div>
                </CardSpotlight>
              ))}
            </div>
          )}
        </div>

        {/* Coordinate bar */}
        {telemetry && (
          <div className="relative flex items-center justify-between px-6 py-3 border-t border-white/[0.06] text-[10px] font-mono text-white/20">
            <span>
              LAT {telemetry.latitude.toFixed(4)}° LON {telemetry.longitude.toFixed(4)}°
            </span>
            <span>
              {telemetry.on_ground ? "ON GROUND" : `FL${Math.round(telemetry.altitude / 100).toString().padStart(3, "0")}`}
            </span>
            <span>
              {new Date(telemetry.timestamp * 1000).toISOString().substring(11, 19)}Z
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
