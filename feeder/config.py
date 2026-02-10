"""
SkyTRACK Feeder Configuration
Reads FSUIPC/XPUIPC memory offsets and POSTs telemetry to the Laravel API.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Laravel API endpoint
API_BASE_URL = os.getenv("SKYTRACK_API_URL", "http://localhost:8000/api")
FEEDER_TOKEN = os.getenv("SKYTRACK_FEEDER_TOKEN", "change-me-in-production")

# Polling interval in seconds (200ms = 5Hz for sub-second latency)
POLL_INTERVAL = float(os.getenv("SKYTRACK_POLL_INTERVAL", "0.2"))

# POST throttle — send to API at most every N seconds (avoid flooding DB)
POST_INTERVAL = float(os.getenv("SKYTRACK_POST_INTERVAL", "0.5"))

# Simulator type: MSFS, P3D, FSX, XPLANE
SIMULATOR = os.getenv("SKYTRACK_SIMULATOR", "MSFS")

# Flight info (set before starting)
CALLSIGN = os.getenv("SKYTRACK_CALLSIGN", "JAL001")
AIRCRAFT_ICAO = os.getenv("SKYTRACK_AIRCRAFT", "B789")
DEPARTURE_ICAO = os.getenv("SKYTRACK_DEPARTURE", "RJTT")
ARRIVAL_ICAO = os.getenv("SKYTRACK_ARRIVAL", "RJAA")

# ──────────────────────────────────────────────
# FSUIPC Offset Map (standard IPC offsets)
# These are the memory offsets read by FSUIPC/XPUIPC.
# Strictly avoids SimConnect — uses raw IPC offsets only.
# ──────────────────────────────────────────────
FSUIPC_OFFSETS = {
    "latitude":       (0x0560, "l"),   # 8-byte signed, *90/10001750
    "longitude":      (0x0568, "l"),   # 8-byte signed, *360/(2^48)
    "altitude":       (0x0574, "l"),   # 4-byte signed, meters * 256
    "heading":        (0x0580, "d"),   # 4-byte unsigned, *360/(2^32)
    "ias":            (0x02BC, "d"),   # 4-byte, knots * 128
    "ground_speed":   (0x02B4, "d"),   # 4-byte, m/s * 65536
    "vertical_speed": (0x02C8, "l"),   # 4-byte signed, ft/min * 256
    "on_ground":      (0x0366, "H"),   # 2-byte, 0=airborne 1=on ground
    "fuel_total_pct": (0x0AF4, "d"),   # 4-byte, percent * 128 * 65536
    "sim_time":       (0x0238, "d"),   # 4-byte, seconds since midnight
}
