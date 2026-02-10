# Testing SkyNET with Microsoft Flight Simulator 2024

SkyNET connects to MSFS 2020 and MSFS 2024 via **SimConnect** (the official Microsoft API). No FSUIPC is required for MSFS.

## Prerequisites

### 1. Microsoft Flight Simulator 2020 or 2024
- Installed and updated.
- You can use any aircraft and airport for testing.

### 2. SimConnect (included with MSFS)
- SimConnect is installed automatically with Microsoft Flight Simulator.
- **No extra software** (e.g. FSUIPC7) is needed for MSFS / MSFS 2024.
- Ensure MSFS is running and a flight is loaded before connecting in SkyNET.

---

## Step-by-step test

### 1. Start MSFS 2024 (or MSFS 2020)
- Launch Microsoft Flight Simulator 2024 (or 2020).
- Load a flight (any aircraft, any airport).
- Wait until you are in the cockpit (on the ground or in the air).

### 2. Build and run the SkyNET client (Windows)
From the repo root:

```bash
cd skynet-client
npm install
npm run tauri:dev
```

For a release build (set `LIBCLANG_PATH` if you use LLVM for the SimConnect bindings):

```bash
# If using standalone LLVM:
set LIBCLANG_PATH=C:\Program Files\LLVM\bin
npm run tauri:build
```

Then run the built executable from `src-tauri/target/release/` or the installer in `src-tauri/target/release/bundle/`.

### 3. Connect to the simulator in SkyNET
1. Open **Settings** (gear icon).
2. Under **Simulator**, select **MSFS / MSFS 2024**.
3. Save and close settings.
4. Click **Connect** to connect via SimConnect (MSFS must be running).
5. When connected, click **Start** to begin receiving live flight data.

### 4. Verify data
- **SimConnect connected**: The app should show that SimConnect is connected (green indicator).
- **Data running**: After **Start**, you should see live updates: position (lat/lon), altitude, speed, heading, fuel, and flight phase.
- Move the aircraft and confirm the numbers and phase change in real time.

### 5. (Optional) Connect to SkyNET backend
- Start the SkyNET backend so the WebSocket is available.
- With the client connected to the sim and data running, the app can send ACARS updates to the backend and (if configured) phpVMS7.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| **"Failed to connect to SimConnect (is MSFS running?)"** | MSFS 2020 or 2024 is running; a flight is loaded (not just the main menu); you're on **Windows**. |
| **No position/altitude updates** | Click **Start** after **Connect**; ensure you're in a loaded flight. |
| **SimConnect shows connected (green) but altitude/speed stay 0 or PREFLIGHT** | (1) Ensure a flight is **loaded** (in cockpit or airborne) before opening SkyNET and connecting. (2) In Settings, disconnect, then connect again and ensure **Start** runs (app does this automatically after connect). (3) If still no data, **restart SkyNET** with MSFS already in a loaded flight, then connect. (4) Try using the **SimConnect.dll from MSFS 2024**: copy it from your sim install (e.g. `C:\Program Files\Microsoft Games\Microsoft Flight Simulator 2024\SimConnect.dll` or the MSFS 2024 SDK `lib` folder) into `skynet-client/src-tauri/simconnect-ffi/lib/`, rebuild, and run again. |
| **Wrong or empty route/callsign** | Use the in-app flight plan / SimBrief integration or enter details manually. |
| **Build fails (bindgen/libclang)** | Set `LIBCLANG_PATH` to your LLVM `bin` folder (e.g. `C:\Program Files\LLVM\bin`). |

---

## Technical note

SkyNET uses **SimCS 2020** and **MSFS 20onnect** for **MSF24** (minimal raw FFI; no FSUIPC). For **FSX** and **Prepar3D**, SkyNET still uses **FSUIPC**.
