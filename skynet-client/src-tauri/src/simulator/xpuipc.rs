// XPUIPC connection module for X-Plane
use super::FlightData;
use std::net::UdpSocket;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

// XPUIPC data structure (simplified)
#[repr(C, packed)]
struct XpuipcData {
    magic: [u8; 4], // "XPU"
    version: u8,
    _reserved: [u8; 3],
    latitude: f64,
    longitude: f64,
    altitude: f64,
    heading: f64,
    ground_speed: f32,
    vertical_speed: f32,
    fuel_total: f32,
    on_ground: u8,
    _padding: [u8; 3],
}

pub struct XpuipcConnection {
    socket: Arc<Mutex<Option<UdpSocket>>>,
    running: Arc<Mutex<bool>>,
    callback: Arc<Mutex<Option<Box<dyn Fn(FlightData) + Send + Sync>>>>,
    port: u16,
}

impl XpuipcConnection {
    pub fn new(port: u16) -> Self {
        Self {
            socket: Arc::new(Mutex::new(None)),
            running: Arc::new(Mutex::new(false)),
            callback: Arc::new(Mutex::new(None)),
            port,
        }
    }

    pub fn set_callback<F>(&mut self, callback: F)
    where
        F: Fn(FlightData) + Send + Sync + 'static,
    {
        *self.callback.lock().unwrap() = Some(Box::new(callback));
    }

    pub fn connect(&mut self) -> Result<(), String> {
        // XPUIPC typically listens on port 49000
        let socket = UdpSocket::bind(format!("127.0.0.1:{}", self.port))
            .map_err(|e| format!("Failed to bind UDP socket: {}", e))?;
        
        socket.set_read_timeout(Some(Duration::from_millis(100)))
            .map_err(|e| format!("Failed to set socket timeout: {}", e))?;
        
        *self.socket.lock().unwrap() = Some(socket);
        Ok(())
    }

    pub fn start(&mut self) -> Result<(), String> {
        if *self.running.lock().unwrap() {
            return Err("Already running".to_string());
        }

        let socket = self.socket.clone();
        let running = self.running.clone();
        let callback = self.callback.clone();

        *self.running.lock().unwrap() = true;
        let running_clone = running.clone();

        thread::spawn(move || {
            let mut buffer = [0u8; 1024];
            
            while *running_clone.lock().unwrap() {
                if let Ok(sock_guard) = socket.lock() {
                    if let Some(ref sock) = *sock_guard {
                        match sock.recv_from(&mut buffer) {
                            Ok((size, _)) => {
                                if size >= std::mem::size_of::<XpuipcData>() {
                                    if let Ok(data) = Self::parse_xpuipc_data(&buffer[..size]) {
                                        if let Ok(cb_guard) = callback.lock() {
                                            if let Some(ref cb) = *cb_guard {
                                                cb(data);
                                            }
                                        }
                                    }
                                }
                            }
                            Err(_) => {
                                // Timeout or error, continue
                            }
                        }
                    }
                }
                thread::sleep(Duration::from_millis(500)); // 2 Hz - keeps UI responsive
            }
        });

        Ok(())
    }

    pub fn stop(&mut self) {
        *self.running.lock().unwrap() = false;
    }

    pub fn disconnect(&mut self) {
        self.stop();
        *self.socket.lock().unwrap() = None;
    }

    pub fn is_connected(&self) -> bool {
        self.socket.lock().map(|s| s.is_some()).unwrap_or(false)
    }

    pub fn is_running(&self) -> bool {
        *self.running.lock().unwrap_or_else(|e| e.into_inner())
    }

    fn parse_xpuipc_data(buffer: &[u8]) -> Result<FlightData, String> {
        // XPUIPC sends data in a specific format
        // This is a simplified parser - actual XPUIPC format may vary
        if buffer.len() < 64 {
            return Err("Buffer too small".to_string());
        }

        // Try to parse as XpuipcData structure
        unsafe {
            let data_ptr = buffer.as_ptr() as *const XpuipcData;
            let data = &*data_ptr;

            // Check magic number
            if data.magic[0] != b'X' || data.magic[1] != b'P' || data.magic[2] != b'U' {
                return Err("Invalid XPUIPC magic number".to_string());
            }

            let ground_speed_ms = data.ground_speed as f64;
            let ground_speed_kts = ground_speed_ms * 1.94384; // Convert m/s to knots
            let fuel_kg = data.fuel_total as f64 * 0.453592; // Convert pounds to kg (assuming XPUIPC uses pounds)
            let vertical_speed_fpm = data.vertical_speed as f64 * 196.85; // Convert m/s to fpm
            let on_ground = data.on_ground != 0;

            Ok(FlightData {
                callsign: "UNKNOWN".to_string(), // XPUIPC doesn't provide callsign directly
                aircraft_icao: "UNKN".to_string(), // XPUIPC doesn't provide aircraft type directly
                departure_icao: "".to_string(),
                arrival_icao: "".to_string(),
                latitude: data.latitude,
                longitude: data.longitude,
                altitude: data.altitude * 3.28084, // Convert meters to feet
                ground_speed: ground_speed_kts.max(0.0),
                heading: data.heading % 360.0,
                fuel_kg: fuel_kg.max(0.0),
                vertical_speed: vertical_speed_fpm,
                on_ground,
                timestamp: chrono::Utc::now().to_rfc3339(),
            })
        }
    }
}

impl Default for XpuipcConnection {
    fn default() -> Self {
        Self::new(49000) // Default XPUIPC port
    }
}
