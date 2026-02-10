"""
SkyTRACK Feeder Client
──────────────────────
Lightweight Python bridge that reads FSUIPC/XPUIPC memory offsets
and POSTs JSON telemetry to the Laravel PHP backend.

Usage:
    python main.py                  # Auto-detect simulator
    python main.py --sim MSFS       # Force MSFS via FSUIPC
    python main.py --sim XPLANE     # Force X-Plane via XPUIPC
"""

import argparse
import json
import math
import struct
import sys
import time
import logging
from typing import Optional

import requests

import config

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("skytrack-feeder")


# ──────────────────────────────────────────────
# FSUIPC Reader (MSFS / P3D / FSX)
# Reads standard IPC offsets — NO SimConnect.
# ──────────────────────────────────────────────
class FSUIPCReader:
    """Reads flight data from FSUIPC using standard memory offsets."""

    def __init__(self):
        self._pyuipc = None
        self._connected = False

    def connect(self) -> bool:
        try:
            import pyuipc
            self._pyuipc = pyuipc
            self._pyuipc.open(0)  # 0 = any simulator
            self._connected = True
            log.info("FSUIPC connected")
            return True
        except Exception as e:
            log.error(f"FSUIPC connection failed: {e}")
            self._connected = False
            return False

    def disconnect(self):
        if self._connected and self._pyuipc:
            try:
                self._pyuipc.close()
            except Exception:
                pass
            self._connected = False
            log.info("FSUIPC disconnected")

    def read(self) -> Optional[dict]:
        """Read all offsets in a single batch for efficiency."""
        if not self._connected:
            return None

        try:
            # Batch read all offsets in one IPC call
            offset_list = [
                (0x0560, 8),   # latitude (8 bytes)
                (0x0568, 8),   # longitude (8 bytes)
                (0x0574, 4),   # altitude
                (0x0580, 4),   # heading (true)
                (0x02BC, 4),   # IAS
                (0x02B4, 4),   # ground speed
                (0x02C8, 4),   # vertical speed
                (0x0366, 2),   # on ground flag
                (0x0AF4, 4),   # fuel total pct
            ]

            results = self._pyuipc.read(offset_list)

            # Decode FSUIPC raw values to real units
            lat_raw = struct.unpack("<q", results[0])[0]
            lon_raw = struct.unpack("<q", results[1])[0]
            alt_raw = struct.unpack("<i", results[2])[0]
            hdg_raw = struct.unpack("<I", results[3])[0]
            ias_raw = struct.unpack("<I", results[4])[0]
            gs_raw  = struct.unpack("<I", results[5])[0]
            vs_raw  = struct.unpack("<i", results[6])[0]
            og_raw  = struct.unpack("<H", results[7])[0]
            fuel_raw = struct.unpack("<I", results[8])[0]

            latitude  = lat_raw * (90.0 / 10001750.0)
            longitude = lon_raw * (360.0 / (2**48))
            altitude  = alt_raw / 256.0 * 3.28084  # meters→feet
            heading   = hdg_raw * (360.0 / (2**32))
            ias       = ias_raw / 128.0
            ground_speed = gs_raw / 65536.0 * 1.94384  # m/s→knots
            vertical_speed = vs_raw / 256.0
            on_ground = og_raw != 0
            fuel_pct  = fuel_raw / (128.0 * 65536.0)

            return {
                "latitude": round(latitude, 6),
                "longitude": round(longitude, 6),
                "altitude": round(altitude, 1),
                "heading": round(heading % 360, 1),
                "ias": round(ias, 1),
                "ground_speed": round(ground_speed, 1),
                "vertical_speed": round(vertical_speed, 0),
                "on_ground": on_ground,
                "fuel_kg": round(fuel_pct * 100, 1),  # placeholder
            }

        except Exception as e:
            log.error(f"FSUIPC read error: {e}")
            self._connected = False
            return None


# ──────────────────────────────────────────────
# XPUIPC Reader (X-Plane)
# Same offset format as FSUIPC but via XPUIPC bridge.
# ──────────────────────────────────────────────
class XPUIPCReader:
    """
    Reads flight data from XPUIPC (X-Plane IPC bridge).
    XPUIPC exposes the same offset interface as FSUIPC,
    so we reuse the same offset map and decoding logic.
    """

    def __init__(self):
        self._pyuipc = None
        self._connected = False

    def connect(self) -> bool:
        try:
            import pyuipc
            self._pyuipc = pyuipc
            # XPUIPC registers itself as an FSUIPC-compatible server
            self._pyuipc.open(0)
            self._connected = True
            log.info("XPUIPC connected (X-Plane)")
            return True
        except Exception as e:
            log.error(f"XPUIPC connection failed: {e}")
            self._connected = False
            return False

    def disconnect(self):
        if self._connected and self._pyuipc:
            try:
                self._pyuipc.close()
            except Exception:
                pass
            self._connected = False
            log.info("XPUIPC disconnected")

    def read(self) -> Optional[dict]:
        """Read offsets — same format as FSUIPC since XPUIPC is compatible."""
        if not self._connected:
            return None

        try:
            offset_list = [
                (0x0560, 8),
                (0x0568, 8),
                (0x0574, 4),
                (0x0580, 4),
                (0x02BC, 4),
                (0x02B4, 4),
                (0x02C8, 4),
                (0x0366, 2),
                (0x0AF4, 4),
            ]

            results = self._pyuipc.read(offset_list)

            lat_raw = struct.unpack("<q", results[0])[0]
            lon_raw = struct.unpack("<q", results[1])[0]
            alt_raw = struct.unpack("<i", results[2])[0]
            hdg_raw = struct.unpack("<I", results[3])[0]
            ias_raw = struct.unpack("<I", results[4])[0]
            gs_raw  = struct.unpack("<I", results[5])[0]
            vs_raw  = struct.unpack("<i", results[6])[0]
            og_raw  = struct.unpack("<H", results[7])[0]
            fuel_raw = struct.unpack("<I", results[8])[0]

            latitude  = lat_raw * (90.0 / 10001750.0)
            longitude = lon_raw * (360.0 / (2**48))
            altitude  = alt_raw / 256.0 * 3.28084
            heading   = hdg_raw * (360.0 / (2**32))
            ias       = ias_raw / 128.0
            ground_speed = gs_raw / 65536.0 * 1.94384
            vertical_speed = vs_raw / 256.0
            on_ground = og_raw != 0
            fuel_pct  = fuel_raw / (128.0 * 65536.0)

            return {
                "latitude": round(latitude, 6),
                "longitude": round(longitude, 6),
                "altitude": round(altitude, 1),
                "heading": round(heading % 360, 1),
                "ias": round(ias, 1),
                "ground_speed": round(ground_speed, 1),
                "vertical_speed": round(vertical_speed, 0),
                "on_ground": on_ground,
                "fuel_kg": round(fuel_pct * 100, 1),
            }

        except Exception as e:
            log.error(f"XPUIPC read error: {e}")
            self._connected = False
            return None


# ──────────────────────────────────────────────
# API Client — POSTs telemetry to Laravel backend
# ──────────────────────────────────────────────
class APIClient:
    """HTTP client that POSTs telemetry JSON to the Laravel API."""

    def __init__(self, base_url: str, token: str):
        self.url = f"{base_url}/telemetry"
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Feeder-Token": token,
        })
        self.session.timeout = 2  # 2s timeout

    def post_telemetry(self, data: dict) -> bool:
        try:
            resp = self.session.post(self.url, json=data)
            if resp.status_code == 200:
                return True
            else:
                log.warning(f"API returned {resp.status_code}: {resp.text[:200]}")
                return False
        except requests.exceptions.ConnectionError:
            log.warning("API connection failed — is the Laravel backend running?")
            return False
        except Exception as e:
            log.warning(f"API post error: {e}")
            return False


# ──────────────────────────────────────────────
# Flight Phase Detection
# ──────────────────────────────────────────────
def detect_flight_phase(data: dict) -> str:
    """Simple flight phase detection from telemetry values."""
    on_ground = data.get("on_ground", True)
    gs = data.get("ground_speed", 0)
    alt = data.get("altitude", 0)
    vs = data.get("vertical_speed", 0)

    if on_ground:
        if gs < 5:
            return "PARKED"
        elif gs < 30:
            return "TAXI"
        else:
            return "TAKEOFF_ROLL"
    else:
        if alt < 10000 and vs > 300:
            return "CLIMB"
        elif alt >= 10000 and vs > 200:
            return "CLIMB"
        elif abs(vs) < 200:
            return "CRUISE"
        elif vs < -300 and alt > 3000:
            return "DESCENT"
        elif alt <= 3000 and vs < -200:
            return "APPROACH"
        else:
            return "EN_ROUTE"


# ──────────────────────────────────────────────
# Main Loop
# ──────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="SkyTRACK Feeder Client")
    parser.add_argument("--sim", choices=["MSFS", "P3D", "FSX", "XPLANE"],
                        default=config.SIMULATOR, help="Simulator type")
    parser.add_argument("--callsign", default=config.CALLSIGN)
    parser.add_argument("--aircraft", default=config.AIRCRAFT_ICAO)
    parser.add_argument("--dep", default=config.DEPARTURE_ICAO)
    parser.add_argument("--arr", default=config.ARRIVAL_ICAO)
    args = parser.parse_args()

    # Select reader based on simulator type
    if args.sim == "XPLANE":
        reader = XPUIPCReader()
    else:
        reader = FSUIPCReader()

    api = APIClient(config.API_BASE_URL, config.FEEDER_TOKEN)

    log.info(f"SkyTRACK Feeder starting")
    log.info(f"  Simulator : {args.sim}")
    log.info(f"  Callsign  : {args.callsign}")
    log.info(f"  Aircraft  : {args.aircraft}")
    log.info(f"  Route     : {args.dep} → {args.arr}")
    log.info(f"  API       : {config.API_BASE_URL}")
    log.info(f"  Poll rate : {config.POLL_INTERVAL}s")
    log.info(f"  Post rate : {config.POST_INTERVAL}s")

    # Connect to simulator
    while not reader.connect():
        log.info("Retrying connection in 5s...")
        time.sleep(5)

    last_post_time = 0
    post_count = 0

    try:
        while True:
            data = reader.read()

            if data is None:
                log.warning("Lost connection, reconnecting...")
                time.sleep(2)
                reader.connect()
                continue

            now = time.time()

            # Throttle API posts to POST_INTERVAL
            if now - last_post_time >= config.POST_INTERVAL:
                payload = {
                    **data,
                    "callsign": args.callsign,
                    "aircraft_icao": args.aircraft,
                    "departure_icao": args.dep,
                    "arrival_icao": args.arr,
                    "simulator": args.sim,
                    "flight_phase": detect_flight_phase(data),
                    "timestamp": now,
                }

                success = api.post_telemetry(payload)
                last_post_time = now
                post_count += 1

                if post_count % 20 == 0:
                    log.info(
                        f"ALT:{data['altitude']:.0f}ft "
                        f"IAS:{data['ias']:.0f}kt "
                        f"HDG:{data['heading']:.0f}° "
                        f"GS:{data['ground_speed']:.0f}kt "
                        f"VS:{data['vertical_speed']:.0f}fpm "
                        f"{'✓' if success else '✗'}"
                    )

            time.sleep(config.POLL_INTERVAL)

    except KeyboardInterrupt:
        log.info("Shutting down...")
    finally:
        reader.disconnect()
        log.info(f"Feeder stopped after {post_count} updates")


if __name__ == "__main__":
    main()
