# Quick Start Guide

## First Time Setup

1. **Install Rust** (if not already installed):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Install dependencies:**
   ```bash
   cd skynet-client
   npm install
   ```

3. **Run the app:**
   ```bash
   npm run tauri:dev
   ```

   On first run, this will:
   - Download and compile Rust dependencies (may take a few minutes)
   - Start the Vite dev server
   - Build the Tauri app
   - Launch the native macOS window

## What You'll See

- A native macOS window titled "SkyNet ACARS"
- Connection status indicator (will show "MOCK DATA" initially since backend isn't running)
- Live-updating flight data simulating a flight from PREFLIGHT → TAXI → TAKEOFF → CLIMB → CRUISE
- Clean dashboard showing:
  - Callsign, Aircraft, Route
  - Flight Phase (large badge)
  - Altitude, Ground Speed, Fuel
  - Heading and Position

## Connecting to Backend

Once the SkyNet backend is running on `ws://localhost:3000`, the app will automatically:
- Connect to the WebSocket server
- Switch from mock data to real data
- Show "CONNECTED" status

## Troubleshooting

**"command not found: tauri"**
- Make sure you ran `npm install` first
- The Tauri CLI is installed as a dev dependency

**Rust compilation errors**
- Ensure Rust is properly installed: `rustc --version`
- Try updating Rust: `rustup update`

**Port 1420 already in use**
- Another process is using the port
- Kill the process or change the port in `vite.config.ts`

**App window doesn't appear**
- Check the terminal for error messages
- Make sure you're on macOS (Tauri v1 requires platform-specific builds)

## Next Steps

- Start the SkyNet backend to see real data
- Connect to X-Plane simulator (future feature)
- Customize the UI and add more features
