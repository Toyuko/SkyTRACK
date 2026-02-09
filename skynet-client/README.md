# SkyNet ACARS Desktop Client

A native macOS desktop application for SkyNet ACARS flight tracking, built with Tauri, React, and TypeScript.

## Prerequisites

- **Node.js** 18+ and npm
- **Rust** (latest stable) - Install from [rustup.rs](https://rustup.rs/)
- **macOS** (for building macOS app)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run in development mode:**
   ```bash
   npm run tauri:dev
   ```

   This will:
   - Start the Vite dev server
   - Build the Tauri app
   - Launch the native macOS window

3. **Build for production:**
   ```bash
   npm run tauri:build
   ```

   The built app will be in `src-tauri/target/release/bundle/`

## Features

- **WebSocket Connection**: Connects to SkyNet backend at `ws://localhost:3000/ws/skynet:flights`
- **Auto-reconnect**: Automatically reconnects if connection drops
- **Mock Data Mode**: Shows simulated flight data when backend is unavailable
- **Live Updates**: Real-time ACARS data display
- **Clean UI**: Modern, readable dashboard with Tailwind CSS

## Configuration

The WebSocket URL can be configured in `src/services/skynetSocket.ts`:

```typescript
constructor(url: string = 'ws://localhost:3000/ws/skynet:flights')
```

## Project Structure

```
skynet-client/
├── src-tauri/          # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs     # Tauri entry point
│   │   └── websocket.rs
│   └── tauri.conf.json # Tauri configuration
├── src/                # React frontend
│   ├── App.tsx         # Main app component
│   ├── main.tsx        # React entry point
│   ├── services/       # WebSocket and mock data services
│   ├── types/          # TypeScript type definitions
│   └── styles/         # CSS/Tailwind styles
└── package.json
```

## Development

- Frontend dev server runs on `http://localhost:1420`
- Tauri window connects to the dev server automatically
- Hot reload is enabled for React components

## Troubleshooting

**App won't build:**
- Ensure Rust is installed: `rustc --version`
- Ensure all npm dependencies are installed: `npm install`

**WebSocket connection fails:**
- Check that SkyNet backend is running on port 3000
- App will automatically switch to mock data mode if backend is unavailable

**Tauri build errors:**
- Make sure you're on macOS for macOS builds
- Check that all Rust dependencies compile: `cd src-tauri && cargo build`

## Next Steps

- Connect to X-Plane via XUIPC
- Add simulator data input
- Implement flight phase detection
- Add flight history tracking
