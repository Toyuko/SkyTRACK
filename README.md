# SkyTRACK

A real-time flight tracking dashboard for flight simulators with a glassmorphism cockpit UI, powered by a PHP 8.3+ Laravel backend, Python data bridge, and React + TypeScript frontend.

## Architecture

```
┌──────────────┐    IPC Offsets    ┌──────────────────┐   HTTP POST    ┌──────────────────┐
│  Simulator   │ ←───────────────→ │  Python Feeder   │ ────────────→ │  Laravel Backend │
│  MSFS / P3D  │    FSUIPC         │  (200ms polling) │   /api/telem  │  (PHP 8.3+)      │
│  X-Plane     │    XPUIPC         └──────────────────┘               │                  │
└──────────────┘                                                      │  Redis Cache ──→ │
                                                                      │  Laravel Reverb  │
                    ┌──────────────────────────────────────────────┐   │  (WebSocket)     │
                    │  React + TypeScript Frontend                 │   └────────┬─────────┘
                    │  Aceternity UI · Glassmorphism · Leaflet     │ ←──────────┘
                    │  Cockpit Display · Floating Dock             │   WebSocket
                    └──────────────────────────────────────────────┘   (sub-second)
```

## Features

- **Sub-Second Live Tracking** — WebSocket via Laravel Reverb, REST polling fallback
- **FSUIPC/XPUIPC Only** — Reads standard IPC memory offsets. No SimConnect dependency
- **Multi-Simulator** — MSFS, MSFS 2024, P3D, FSX, X-Plane
- **Glassmorphism Cockpit** — Frosted-glass instrument panel with Aceternity UI spotlight effects
- **Leaflet Dark Map** — CartoDB Dark Matter tiles with real-time aircraft marker and trail
- **Floating Dock Nav** — macOS-style dock (split/cockpit/map views) with spring physics
- **Redis Flight State** — Current telemetry cached in Redis with 5-minute TTL
- **phpVMS7 Integration** — Automatic PIREP submission, flight booking, bid management
- **Japan Airlines Theme** — Red/navy dark cockpit aesthetic with JetBrains Mono typography

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | PHP 8.3+, Laravel 11, Laravel Reverb (WebSocket), Redis |
| **Frontend** | TypeScript, React 18, Tailwind CSS, Framer Motion |
| **UI Components** | Aceternity UI (CardSpotlight, FloatingDock, MovingBorder, Spotlight) |
| **Map** | Leaflet + react-leaflet (CartoDB Dark Matter tiles) |
| **Data Bridge** | Python 3.10+, pyuipc (FSUIPC/XPUIPC offset reader) |
| **Database** | MongoDB 7 (flight history), Redis (live state cache) |
| **Infrastructure** | Docker Compose (PHP-FPM, Nginx, Reverb, MongoDB, Redis) |

## Quick Start

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts: MongoDB, Redis, PHP-FPM, Nginx (`:8000`), Laravel Reverb (`:8080`)

### 2. Frontend Development

```bash
cd skynet-client
npm install
npm run dev
```

Open `http://localhost:5173/#/dashboard` for the new glassmorphism cockpit UI.

### 3. Python Feeder (connect to simulator)

```bash
cd feeder
pip install -r requirements.txt
cp .env.example .env   # Edit with your settings
python main.py --sim MSFS --callsign JAL001
```

### 4. Laravel Backend Setup

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan reverb:start
```

## Project Structure

```
SkyTRACK-main/
├── backend/                    # Laravel 11 PHP API
│   ├── app/
│   │   ├── Http/Controllers/   # TelemetryController (ingest, current, show)
│   │   ├── Events/             # FlightDataUpdated (broadcast via Reverb)
│   │   ├── Services/           # FlightStateService (Redis CRUD)
│   │   └── Http/Middleware/    # FeederAuthentication (X-Feeder-Token)
│   ├── config/skytrack.php     # Feeder token, flight TTL, Reverb config
│   ├── routes/api.php          # POST /api/telemetry, GET /api/telemetry/current
│   ├── docker/nginx.conf       # Nginx reverse proxy config
│   └── Dockerfile              # PHP 8.3-FPM Alpine
│
├── feeder/                     # Python FSUIPC/XPUIPC bridge
│   ├── main.py                 # Main feeder loop (200ms poll → 500ms POST)
│   ├── config.py               # FSUIPC offset map, API settings
│   └── requirements.txt        # pyuipc, requests, python-dotenv
│
├── skynet-client/              # React + TypeScript frontend
│   ├── src/
│   │   ├── pages/Dashboard.tsx           # Main glassmorphism cockpit dashboard
│   │   ├── components/CockpitDisplay.tsx # HUD instrument panel (CardSpotlight)
│   │   ├── components/FlightMapLeaflet.tsx # Leaflet dark map with trail
│   │   ├── components/ui/               # Aceternity UI components
│   │   │   ├── floating-dock.tsx         # macOS dock navigation
│   │   │   ├── card-spotlight.tsx        # Mouse-following spotlight cards
│   │   │   ├── moving-border.tsx         # Animated border buttons
│   │   │   ├── glowing-effect.tsx        # Glow hover effect
│   │   │   └── spotlight.tsx             # Background spotlight SVG
│   │   ├── services/flightDataService.ts # WebSocket + REST telemetry client
│   │   ├── lib/utils.ts                  # cn() utility (clsx + tailwind-merge)
│   │   └── styles/index.css              # Glassmorphism base, Leaflet dark overrides
│   └── tailwind.config.js      # JAL colors, JetBrains Mono, glass shadows
│
├── src/                        # Legacy Node.js backend (MongoDB)
├── phpvms-module/              # phpVMS7 Laravel module
└── docker-compose.yml          # Full stack: PHP, Nginx, Reverb, MongoDB, Redis
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/telemetry` | Ingest telemetry from feeder (requires `X-Feeder-Token`) |
| `GET` | `/api/telemetry/current` | All active flights from Redis |
| `GET` | `/api/telemetry/{callsign}` | Specific flight state |
| `DELETE` | `/api/telemetry/{callsign}` | Remove flight from tracking |
| `GET` | `/api/health` | Service health check |

## Data Flow

1. **Feeder** reads FSUIPC/XPUIPC memory offsets at 200ms (5 Hz)
2. **Feeder** POSTs JSON telemetry to Laravel API at 500ms (2 Hz)
3. **Laravel** stores current state in **Redis** (SET with 5min TTL)
4. **Laravel** broadcasts `FlightDataUpdated` event via **Reverb** WebSocket
5. **React** receives telemetry on WebSocket channel `flights` → event `telemetry.updated`
6. **CockpitDisplay** renders instruments with Framer Motion value transitions
7. **FlightMapLeaflet** updates aircraft marker position and trail polyline

## FSUIPC Offset Map

| Offset | Size | Description | Conversion |
|--------|------|-------------|-----------|
| `0x0560` | 8B | Latitude | `raw × 90 / 10001750` |
| `0x0568` | 8B | Longitude | `raw × 360 / 2^48` |
| `0x0574` | 4B | Altitude | `raw / 256 × 3.28084` (m→ft) |
| `0x0580` | 4B | Heading | `raw × 360 / 2^32` |
| `0x02BC` | 4B | IAS | `raw / 128` (knots) |
| `0x02B4` | 4B | Ground Speed | `raw / 65536 × 1.94384` (m/s→kt) |
| `0x02C8` | 4B | Vertical Speed | `raw / 256` (fpm) |
| `0x0366` | 2B | On Ground | `0 = airborne, 1 = ground` |

## License

MIT License
