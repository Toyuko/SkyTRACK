//! SimConnect connection for MSFS / MSFS 2024 using minimal raw FFI (Windows only).

#![cfg(windows)]

use super::FlightData;
use std::ffi::CString;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

// Generated bindings (build.rs writes to OUT_DIR)
include!(concat!(env!("OUT_DIR"), "/simconnect_bindings.rs"));

const DEFINE_ID: u32 = 1;
const REQUEST_ID: u32 = 1;
const REQUEST_ID_INIT: u32 = 2;
const SIMCONNECT_PERIOD_SECOND: i32 = 4;
const SIMCONNECT_PERIOD_ONCE: i32 = 1;

/// Layout must match AddToDataDefinition order and SimConnect data types.
#[repr(C)]
struct SimConnectData {
    latitude: f64,
    longitude: f64,
    altitude: f64,
    ground_velocity_fps: f64,
    heading: f64,
    fuel_gallons: f64,
    vertical_speed: f64,
    sim_on_ground: i32,
    title: [u8; 256],
    atc_id: [u8; 256],
}

fn add_data_definition(handle: *mut std::ffi::c_void) -> Result<(), String> {
    let add = |name: &str, unit: &str, datum_type: i32| {
        let name_c = CString::new(name).map_err(|e| e.to_string())?;
        let unit_c = CString::new(unit).map_err(|e| e.to_string())?;
        let hr = unsafe {
            SimConnect_AddToDataDefinition(
                handle,
                DEFINE_ID,
                name_c.as_ptr(),
                unit_c.as_ptr(),
                datum_type,
                0.0,
                SIMCONNECT_UNUSED,
            )
        };
        if hr != 0 {
            return Err(format!("AddToDataDefinition {} failed: {}", name, hr));
        }
        Ok(())
    };

    add("PLANE LATITUDE", "degrees", 4)?; // FLOAT64
    add("PLANE LONGITUDE", "degrees", 4)?;
    add("PLANE ALTITUDE", "feet", 4)?;
    add("GROUND VELOCITY", "feet per second", 4)?;
    add("PLANE HEADING DEGREES TRUE", "degrees", 4)?;
    add("FUEL TOTAL QUANTITY", "gallons", 4)?;
    add("VERTICAL SPEED", "feet per minute", 4)?;
    add("SIM ON GROUND", "bool", 1)?; // INT32 for bool
    add("TITLE", "", 8)?; // STRING256
    add("ATC ID", "", 8)?;
    Ok(())
}

fn parse_c_string(b: &[u8]) -> String {
    let end = b.iter().position(|&c| c == 0).unwrap_or(b.len());
    String::from_utf8_lossy(&b[..end]).trim().to_string()
}

/// Opaque SimConnect handle; safe to share for GetNextDispatch from worker thread.
struct SimConnectHandle(*mut std::ffi::c_void);
unsafe impl Send for SimConnectHandle {}
unsafe impl Sync for SimConnectHandle {}

pub struct SimConnectConnection {
    handle: Arc<Mutex<Option<SimConnectHandle>>>,
    running: Arc<Mutex<bool>>,
    callback: Arc<Mutex<Option<Box<dyn Fn(FlightData) + Send + Sync>>>>,
}

impl SimConnectConnection {
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

    pub fn connect(&mut self) -> Result<(), String> {
        let mut ph = std::ptr::null_mut();
        let name = CString::new("SkyNET").map_err(|e| e.to_string())?;
        let hr = unsafe {
            SimConnect_Open(
                &mut ph,
                name.as_ptr(),
                std::ptr::null_mut(),
                0,
                std::ptr::null_mut(),
                0,
            )
        };
        if hr != 0 || ph.is_null() {
            return Err(format!(
                "Failed to connect to SimConnect (is MSFS running?): HRESULT={}",
                hr
            ));
        }

        unsafe {
            let _ = SimConnect_ClearDataDefinition(ph, DEFINE_ID);
            add_data_definition(ph)?;
            let hr2 = SimConnect_RequestDataOnSimObject(
                ph,
                REQUEST_ID,
                DEFINE_ID,
                SIMCONNECT_OBJECT_ID_USER,
                SIMCONNECT_PERIOD_SECOND,
                0,
                0,
                0,
                0,
            );
            if hr2 != 0 {
                let _ = SimConnect_Close(ph);
                return Err(format!("RequestDataOnSimObject failed: {}", hr2));
            }
            // Request one immediate packet so we get data without waiting up to 1 sim second
            let _ = SimConnect_RequestDataOnSimObject(
                ph,
                REQUEST_ID_INIT,
                DEFINE_ID,
                SIMCONNECT_OBJECT_ID_USER,
                SIMCONNECT_PERIOD_ONCE,
                0,
                0,
                0,
                0,
            );
        }

        *self.handle.lock().unwrap() = Some(SimConnectHandle(ph));
        Ok(())
    }

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
                let mut pp_data: *mut SIMCONNECT_RECV = std::ptr::null_mut();
                let mut cb_data: DWORD = 0;

                let h = handle
                    .lock()
                    .unwrap()
                    .as_ref()
                    .map(|s| s.0)
                    .unwrap_or(std::ptr::null_mut());
                if h.is_null() {
                    thread::sleep(Duration::from_millis(100));
                    continue;
                }

                let hr = unsafe { SimConnect_GetNextDispatch(h, &mut pp_data, &mut cb_data) };
                if hr != 0 || pp_data.is_null() {
                    thread::sleep(Duration::from_millis(100));
                    continue;
                }

                let recv = unsafe { &*pp_data };
                let dw_id = recv.dwID;
                if dw_id == SIMCONNECT_RECV_ID_SIMOBJECT_DATA && cb_data >= 12 {
                    let _obj = unsafe { &*(pp_data as *const SIMCONNECT_RECV_SIMOBJECT_DATA) };
                    let data_ptr = unsafe {
                        (pp_data as *const u8).add(std::mem::size_of::<SIMCONNECT_RECV_SIMOBJECT_DATA>())
                    };
                    if cb_data as usize >= std::mem::size_of::<SIMCONNECT_RECV_SIMOBJECT_DATA>() + std::mem::size_of::<SimConnectData>() {
                        let data = unsafe { &*data_ptr.cast::<SimConnectData>() };
                        let ground_speed_kts = (data.ground_velocity_fps * 0.592484).max(0.0);
                        let fuel_kg = (data.fuel_gallons * 3.78541 * 0.8).max(0.0);
                        let aircraft_icao = parse_c_string(&data.title)
                            .to_uppercase()
                            .chars()
                            .take(4)
                            .collect::<String>();
                        let callsign = parse_c_string(&data.atc_id).to_uppercase();

                        let flight_data = FlightData {
                            callsign: if callsign.is_empty() {
                                "UNKNOWN".to_string()
                            } else {
                                callsign
                            },
                            aircraft_icao: if aircraft_icao.is_empty() {
                                "UNKN".to_string()
                            } else {
                                aircraft_icao
                            },
                            departure_icao: String::new(),
                            arrival_icao: String::new(),
                            latitude: data.latitude,
                            longitude: data.longitude,
                            altitude: data.altitude,
                            ground_speed: ground_speed_kts,
                            heading: data.heading % 360.0,
                            fuel_kg,
                            vertical_speed: data.vertical_speed,
                            on_ground: data.sim_on_ground != 0,
                            timestamp: chrono::Utc::now().to_rfc3339(),
                        };

                        if let Ok(cb_guard) = callback.lock() {
                            if let Some(ref cb) = *cb_guard {
                                cb(flight_data);
                            }
                        }
                    }
                }

                thread::sleep(Duration::from_millis(100));
            }

            if let Some(ref h) = *handle.lock().unwrap() {
                unsafe {
                    let _ = SimConnect_ClearDataDefinition(h.0, DEFINE_ID);
                }
            }
        });

        Ok(())
    }

    pub fn stop(&mut self) {
        *self.running.lock().unwrap() = false;
    }

    pub fn disconnect(&mut self) {
        self.stop();
        if let Some(ref h) = *self.handle.lock().unwrap() {
            unsafe {
                let _ = SimConnect_ClearDataDefinition(h.0, DEFINE_ID);
                let _ = SimConnect_Close(h.0);
            }
        }
        *self.handle.lock().unwrap() = None;
    }

    pub fn is_connected(&self) -> bool {
        self.handle.lock().map(|h| h.is_some()).unwrap_or(false)
    }

    pub fn is_running(&self) -> bool {
        *self.running.lock().unwrap_or_else(|e| e.into_inner())
    }
}

impl Default for SimConnectConnection {
    fn default() -> Self {
        Self::new()
    }
}
