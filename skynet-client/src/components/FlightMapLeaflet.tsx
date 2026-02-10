import React, { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "../lib/utils";
import type { TelemetryData } from "../services/flightDataService";

interface FlightMapLeafletProps {
  telemetry: TelemetryData | null;
  trail: [number, number][];
  className?: string;
}

// Custom aircraft icon using SVG rotated to heading
function createAircraftIcon(heading: number): L.DivIcon {
  return L.divIcon({
    className: "aircraft-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `
      <div style="transform: rotate(${heading}deg); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L8 10H3L5 13L3 22L12 18L21 22L19 13L21 10H16L12 2Z" 
                fill="#C8102E" stroke="#fff" stroke-width="0.5"/>
        </svg>
      </div>
    `,
  });
}

// Recenter map when aircraft moves
function MapFollower({ position, zoom }: { position: [number, number] | null; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, zoom, { animate: true, duration: 0.5 });
    }
  }, [position, zoom, map]);

  return null;
}

/**
 * FlightMapLeaflet
 *
 * Leaflet-based flight tracking map with:
 * - Dark tile layer for cockpit aesthetic
 * - Aircraft marker rotated to heading
 * - Trail polyline showing flight path
 * - Departure/arrival markers
 */
export const FlightMapLeaflet: React.FC<FlightMapLeafletProps> = ({
  telemetry,
  trail,
  className,
}) => {
  const mapRef = useRef<L.Map | null>(null);

  const position: [number, number] | null = useMemo(() => {
    if (!telemetry) return null;
    return [telemetry.latitude, telemetry.longitude];
  }, [telemetry?.latitude, telemetry?.longitude]);

  const aircraftIcon = useMemo(() => {
    return createAircraftIcon(telemetry?.heading ?? 0);
  }, [telemetry?.heading]);

  const defaultCenter: [number, number] = [35.6762, 139.6503]; // Tokyo
  const defaultZoom = 6;

  return (
    <div className={cn("relative rounded-2xl overflow-hidden border border-white/[0.08]", className)}>
      {/* Glassmorphism overlay at top */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none h-16 bg-gradient-to-b from-black/40 to-transparent" />

      <MapContainer
        center={position ?? defaultCenter}
        zoom={position ? 8 : defaultZoom}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
        ref={mapRef}
        style={{ background: "#0a0a1a" }}
      >
        {/* Dark tile layer — CartoDB Dark Matter */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {/* Follow aircraft */}
        {position && <MapFollower position={position} zoom={8} />}

        {/* Trail polyline */}
        {trail.length > 1 && (
          <Polyline
            positions={trail}
            pathOptions={{
              color: "#C8102E",
              weight: 2,
              opacity: 0.6,
              dashArray: "6,4",
            }}
          />
        )}

        {/* Aircraft marker */}
        {position && telemetry && (
          <Marker position={position} icon={aircraftIcon}>
            <Popup className="flight-popup">
              <div className="text-sm font-mono">
                <div className="font-bold text-base mb-1">{telemetry.callsign}</div>
                <div>ALT: {Math.round(telemetry.altitude).toLocaleString()} ft</div>
                <div>IAS: {Math.round(telemetry.ias)} kt</div>
                <div>HDG: {Math.round(telemetry.heading)}°</div>
                <div>GS: {Math.round(telemetry.ground_speed)} kt</div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Glassmorphism coordinate display */}
      {telemetry && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-black/50 backdrop-blur-xl border border-white/[0.08] rounded-lg px-3 py-1.5 text-[10px] font-mono text-white/50">
          {telemetry.latitude.toFixed(4)}°N {telemetry.longitude.toFixed(4)}°E
        </div>
      )}
    </div>
  );
};
