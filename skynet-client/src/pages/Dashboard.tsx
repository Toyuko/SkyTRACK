import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Spotlight } from "../components/ui/spotlight";
import { FloatingDock, type DockItem } from "../components/ui/floating-dock";
import { CockpitDisplay } from "../components/CockpitDisplay";
import { FlightMapLeaflet } from "../components/FlightMapLeaflet";
import { CardSpotlight } from "../components/ui/card-spotlight";
import {
  FlightDataService,
  type TelemetryData,
} from "../services/flightDataService";

/**
 * Dashboard
 *
 * Main flight tracking dashboard with:
 * - Aceternity Spotlight background effect
 * - Glassmorphism CockpitDisplay (instrument panel)
 * - Leaflet dark map with aircraft trail
 * - Floating macOS-style dock navigation
 * - Real-time WebSocket telemetry from Laravel Reverb
 */
export function Dashboard() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeView, setActiveView] = useState<"cockpit" | "map" | "split">("split");
  const [trail, setTrail] = useState<[number, number][]>([]);
  const serviceRef = useRef<FlightDataService | null>(null);

  // Start FlightDataService on mount
  useEffect(() => {
    const service = new FlightDataService();
    serviceRef.current = service;

    const unsubTelemetry = service.onTelemetry((data) => {
      setTelemetry(data);

      // Append to trail (keep last 500 points)
      setTrail((prev) => {
        const next = [...prev, [data.latitude, data.longitude] as [number, number]];
        return next.length > 500 ? next.slice(-500) : next;
      });
    });

    const unsubConnection = service.onConnectionChange((status) => {
      setConnected(status === "connected");
    });

    service.start();

    return () => {
      unsubTelemetry();
      unsubConnection();
      service.stop();
    };
  }, []);

  // Elapsed time since first telemetry
  const [elapsed, setElapsed] = useState("00:00:00");
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (telemetry && !startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    const interval = setInterval(() => {
      if (!startTimeRef.current) return;
      const diff = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const h = Math.floor(diff / 3600).toString().padStart(2, "0");
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, "0");
      const s = (diff % 60).toString().padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [telemetry]);

  // Dock navigation items
  const dockItems: DockItem[] = [
    {
      title: "Split View",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
      onClick: () => setActiveView("split"),
      active: activeView === "split",
    },
    {
      title: "Cockpit",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      onClick: () => setActiveView("cockpit"),
      active: activeView === "cockpit",
    },
    {
      title: "Map",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      onClick: () => setActiveView("map"),
      active: activeView === "map",
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#060611] overflow-hidden">
      {/* ─── Background Effects ─── */}
      <div className="fixed inset-0 dot-grid pointer-events-none" />
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#C8102E" />

      {/* Ambient gradient orbs */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-jal-red/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

      {/* ─── Header ─── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-2.5"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative">
              <svg className="w-8 h-8 text-jal-red" viewBox="0 0 32 32" fill="currentColor">
                <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 2c2.577 0 4.964.822 6.916 2.213L8.213 22.916A11.935 11.935 0 014 16C4 9.373 9.373 4 16 4zm0 24c-2.577 0-4.964-.822-6.916-2.213L23.787 9.084A11.935 11.935 0 0128 16c0 6.627-5.373 12-12 12z" />
              </svg>
              <motion.div
                className="absolute -inset-1 rounded-full bg-jal-red/20 blur-sm"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Sky<span className="text-jal-red">TRACK</span>
              </h1>
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/20">
                Flight Telemetry
              </p>
            </div>
          </motion.div>

          {/* Accent bar */}
          <div className="h-6 w-px bg-white/[0.06]" />

          {/* Status */}
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-white/20"}`} />
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
              {connected ? "Live" : "Offline"}
            </span>
          </motion.div>
        </div>

        {/* Right side — elapsed time + callsign */}
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {telemetry && (
            <>
              <div className="text-right">
                <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/20">
                  Elapsed
                </div>
                <div className="text-sm font-mono text-white/60 tabular-nums">{elapsed}</div>
              </div>
              <div className="h-6 w-px bg-white/[0.06]" />
              <div className="text-right">
                <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/20">
                  Route
                </div>
                <div className="text-sm font-mono text-white/60">
                  {telemetry.departure_icao ?? "----"}
                  <span className="text-jal-red mx-1">→</span>
                  {telemetry.arrival_icao ?? "----"}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </header>

      {/* ─── JAL Accent Line ─── */}
      <div className="jal-accent-bar mx-6" />

      {/* ─── Main Content ─── */}
      <main className="relative z-10 flex-1 px-6 pt-4 pb-24">
        {activeView === "split" && (
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-180px)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Left — Cockpit Display */}
            <div className="flex flex-col gap-4 min-h-0">
              <CockpitDisplay
                telemetry={telemetry}
                connected={connected}
              />

              {/* Quick stats row */}
              {telemetry && (
                <div className="grid grid-cols-3 gap-3">
                  <QuickStat
                    label="Distance"
                    value={trail.length > 1 ? calcTrailDistance(trail).toFixed(0) : "0"}
                    unit="NM"
                  />
                  <QuickStat
                    label="Track"
                    value={Math.round(telemetry.heading).toString().padStart(3, "0")}
                    unit="°T"
                  />
                  <QuickStat
                    label="Mach"
                    value={(telemetry.ias / 573).toFixed(2)}
                    unit=""
                  />
                </div>
              )}
            </div>

            {/* Right — Map */}
            <FlightMapLeaflet
              telemetry={telemetry}
              trail={trail}
              className="h-full min-h-[300px]"
            />
          </motion.div>
        )}

        {activeView === "cockpit" && (
          <motion.div
            className="max-w-3xl mx-auto h-[calc(100vh-180px)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CockpitDisplay
              telemetry={telemetry}
              connected={connected}
              className="h-full"
            />
          </motion.div>
        )}

        {activeView === "map" && (
          <motion.div
            className="h-[calc(100vh-180px)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <FlightMapLeaflet
              telemetry={telemetry}
              trail={trail}
              className="h-full"
            />
            {/* Floating cockpit mini-panel */}
            {telemetry && (
              <motion.div
                className="absolute bottom-28 left-10 z-20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="glass-card p-4 flex items-center gap-6">
                  <MiniInstrument label="ALT" value={`${Math.round(telemetry.altitude).toLocaleString()}`} unit="FT" color="text-cyan-400" />
                  <div className="w-px h-8 bg-white/[0.06]" />
                  <MiniInstrument label="IAS" value={`${Math.round(telemetry.ias)}`} unit="KT" color="text-green-400" />
                  <div className="w-px h-8 bg-white/[0.06]" />
                  <MiniInstrument label="HDG" value={Math.round(telemetry.heading).toString().padStart(3, "0")} unit="°" color="text-amber-400" />
                  <div className="w-px h-8 bg-white/[0.06]" />
                  <MiniInstrument label="VS" value={`${telemetry.vertical_speed > 0 ? "+" : ""}${Math.round(telemetry.vertical_speed)}`} unit="FPM" color="text-purple-400" />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>

      {/* ─── Floating Dock (bottom center) ─── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <FloatingDock items={dockItems} />
      </div>
    </div>
  );
}

// ─── Sub-components ───

function QuickStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <CardSpotlight radius={150} color="rgba(200,16,46,0.1)" className="!bg-white/[0.02] !border-white/[0.05]">
      <div className="p-3">
        <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/25 mb-1">{label}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-mono font-semibold text-white/80 tabular-nums">{value}</span>
          <span className="text-[9px] font-mono text-white/20">{unit}</span>
        </div>
      </div>
    </CardSpotlight>
  );
}

function MiniInstrument({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-[8px] font-mono uppercase tracking-[0.15em] text-white/20 mb-0.5">{label}</div>
      <div className="flex items-baseline justify-center gap-0.5">
        <span className={`text-sm font-mono font-semibold tabular-nums ${color}`}>{value}</span>
        <span className="text-[8px] font-mono text-white/15">{unit}</span>
      </div>
    </div>
  );
}

// ─── Helpers ───

function calcTrailDistance(trail: [number, number][]): number {
  let totalNm = 0;
  for (let i = 1; i < trail.length; i++) {
    totalNm += haversineNm(trail[i - 1][0], trail[i - 1][1], trail[i][0], trail[i][1]);
  }
  return totalNm;
}

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
