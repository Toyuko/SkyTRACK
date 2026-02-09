// FSUIPC connection module for MSFS (FSUIPC7), FSX, and P3D.
//
// MSFS / MSFS 2024 are 64-bit, so we support both x86 and x64 builds.
// The upstream `fsuipc` crate only exposes user-mode on 32-bit (because the
// protocol embeds pointers). For x64, we implement the same user-mode protocol
// in `fsuipc_user64`.
#[cfg(all(windows, target_pointer_width = "32"))]
use fsuipc::{user::UserHandle, Handle, Session};
#[cfg(all(windows, target_pointer_width = "64"))]
use super::fsuipc_user64::UserHandle64 as UserHandle;
use super::FlightData;
use std::sync::{Arc, Mutex};
#[cfg(windows)]
use std::thread;
#[cfg(windows)]
use std::time::Duration;

pub struct FsuipcConnection {
    handle: Arc<Mutex<Option<UserHandle>>>,
    running: Arc<Mutex<bool>>,
    callback: Arc<Mutex<Option<Box<dyn Fn(FlightData) + Send + Sync>>>>,
}

impl FsuipcConnection {
    pub fn new() -> Self {
        Self {
            handle: Arc::new(Mutex::new(None)),
            running: Arc::new(Mutex::new(false)),
            callback: Arc::new(Mutex::new(None)),
        }
    }

    pub fn set_callback<F>(&mut self, callback: F)
    where
        F: Fn(FlightData) + Send + Sync + 'static,
    {
        *self.callback.lock().unwrap() = Some(Box::new(callback));
    }

    #[cfg(windows)]
    pub fn connect(&mut self) -> Result<(), String> {
        let handle = UserHandle::new()
            .map_err(|e| format!("Failed to connect to FSUIPC: {:?}", e))?;
        
        *self.handle.lock().unwrap() = Some(handle);
        Ok(())
    }

    #[cfg(not(windows))]
    pub fn connect(&mut self) -> Result<(), String> {
        Err("FSUIPC is only supported on Windows.".to_string())
    }

    #[cfg(windows)]
    pub fn start(&mut self) -> Result<(), String> {
        if *self.running.lock().unwrap() {
            return Err("Already running".to_string());
        }

        let handle = self.handle.clone();
        let running = self.running.clone();
        let callback = self.callback.clone();

        *self.running.lock().unwrap() = true;
        let running_clone = running.clone();

        thread::spawn(move || {
            while *running_clone.lock().unwrap() {
                if let Ok(guard) = handle.lock() {
                    if guard.is_some() {
                        if let Ok(data) = Self::read_flight_data(&handle) {
                            if let Ok(cb_guard) = callback.lock() {
                                if let Some(ref cb) = *cb_guard {
                                    cb(data);
                                }
                            }
                        }
                    }
                }
                thread::sleep(Duration::from_millis(500)); // 2 Hz - keeps UI responsive
            }
        });

        Ok(())
    }

    #[cfg(not(windows))]
    pub fn start(&mut self) -> Result<(), String> {
        Err("FSUIPC is only supported on Windows".to_string())
    }

    pub fn stop(&mut self) {
        *self.running.lock().unwrap() = false;
    }

    pub fn disconnect(&mut self) {
        self.stop();
        *self.handle.lock().unwrap() = None;
    }

    pub fn is_connected(&self) -> bool {
        self.handle.lock().map(|h| h.is_some()).unwrap_or(false)
    }

    pub fn is_running(&self) -> bool {
        *self.running.lock().unwrap_or_else(|e| e.into_inner())
    }

    #[cfg(windows)]
    fn read_flight_data(handle: &Arc<Mutex<Option<UserHandle>>>) -> Result<FlightData, String> {
        let mut handle_guard = handle.lock().unwrap();
        let handle_ref = handle_guard.as_mut().ok_or("FSUIPC not connected")?;
        
        let mut session = handle_ref.session();

        // FSUIPC offsets
        let mut latitude: f64 = 0.0; // 0x0560 - 64-bit double
        let mut longitude: f64 = 0.0; // 0x0568 - 64-bit double
        let mut altitude: f64 = 0.0; // 0x0570 - 64-bit double (feet)
        let mut ground_speed_raw: u32 = 0; // 0x02B4 - Ground speed (metres/sec * 65536)
        let mut heading: f64 = 0.0; // 0x0578 - 64-bit double (degrees)
        let mut fuel_gallons: f32 = 0.0; // 0x0AF4 - Total fuel (gallons)
        let mut vertical_speed_raw: i16 = 0; // 0x02C8 - Vertical speed (feet/min * 256)
        let mut on_ground_flag: u32 = 0; // 0x0366 - On ground flag
        let mut aircraft_type: [u8; 24] = [0; 24]; // 0x3160 - Aircraft type (ICAO)
        let mut atc_id: [u8; 12] = [0; 12]; // 0x3D00 - ATC ID (callsign)

        // Read offsets
        session
            .read(0x0560, &mut latitude)
            .map_err(|e| format!("Failed to read latitude: {}", e))?;
        session
            .read(0x0568, &mut longitude)
            .map_err(|e| format!("Failed to read longitude: {}", e))?;
        session
            .read(0x0570, &mut altitude)
            .map_err(|e| format!("Failed to read altitude: {}", e))?;
        session
            .read(0x02B4, &mut ground_speed_raw)
            .map_err(|e| format!("Failed to read ground speed: {}", e))?;
        session
            .read(0x0578, &mut heading)
            .map_err(|e| format!("Failed to read heading: {}", e))?;
        session
            .read(0x0AF4, &mut fuel_gallons)
            .map_err(|e| format!("Failed to read fuel: {}", e))?;
        session
            .read(0x02C8, &mut vertical_speed_raw)
            .map_err(|e| format!("Failed to read vertical speed: {}", e))?;
        session
            .read(0x0366, &mut on_ground_flag)
            .map_err(|e| format!("Failed to read on ground flag: {}", e))?;
        session
            .read(0x3160, &mut aircraft_type)
            .map_err(|e| format!("Failed to read aircraft type: {}", e))?;
        session
            .read(0x3D00, &mut atc_id)
            .map_err(|e| format!("Failed to read ATC ID: {}", e))?;

        session
            .process()
            .map_err(|e| format!("Failed to process FSUIPC session: {}", e))?;

        // Convert data
        let ground_speed_ms = ground_speed_raw as f64 / 65536.0;
        let ground_speed_kts = ground_speed_ms * 1.94384; // Convert m/s to knots
        let fuel_kg = fuel_gallons as f64 * 3.78541 * 0.8; // Convert gallons to kg (assuming 0.8 kg/L for jet fuel)
        let vertical_speed_fpm = vertical_speed_raw as f64 / 256.0;
        let on_ground = on_ground_flag != 0;

        // Parse strings (null-terminated)
        let aircraft_icao = String::from_utf8_lossy(&aircraft_type)
            .trim_end_matches('\0')
            .trim()
            .to_uppercase();
        let callsign = String::from_utf8_lossy(&atc_id)
            .trim_end_matches('\0')
            .trim()
            .to_uppercase();

        // For now, use placeholder values for departure/arrival
        // These would typically come from flight plan or user input
        let departure_icao = "".to_string();
        let arrival_icao = "".to_string();

        Ok(FlightData {
            callsign: if callsign.is_empty() { "UNKNOWN".to_string() } else { callsign },
            aircraft_icao: if aircraft_icao.is_empty() { "UNKN".to_string() } else { aircraft_icao.chars().take(4).collect() },
            departure_icao,
            arrival_icao,
            latitude,
            longitude,
            altitude,
            ground_speed: ground_speed_kts.max(0.0),
            heading: heading % 360.0,
            fuel_kg: fuel_kg.max(0.0),
            vertical_speed: vertical_speed_fpm,
            on_ground,
            timestamp: chrono::Utc::now().to_rfc3339(),
        })
    }

    #[cfg(not(windows))]
    fn read_flight_data(_handle: &Arc<Mutex<Option<UserHandle>>>) -> Result<FlightData, String> {
        Err("FSUIPC not supported on this platform".to_string())
    }
}

impl Default for FsuipcConnection {
    fn default() -> Self {
        Self::new()
    }
}
