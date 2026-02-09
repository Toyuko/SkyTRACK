// Simulator connection manager
mod fsuipc;
#[cfg(all(windows, target_pointer_width = "64"))]
mod fsuipc_user64;
#[cfg(windows)]
mod simconnect;
mod xpuipc;

use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct StoredFlightPlan {
    pub callsign: Option<String>,
    pub aircraft_icao: Option<String>,
    pub departure_icao: Option<String>,
    pub arrival_icao: Option<String>,
    pub route: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum SimulatorType {
    MSFS,
    FSX,
    P3D,
    XPLANE,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlightData {
    pub callsign: String,
    pub aircraft_icao: String,
    pub departure_icao: String,
    pub arrival_icao: String,
    pub latitude: f64,
    pub longitude: f64,
    pub altitude: f64,
    pub ground_speed: f64,
    pub heading: f64,
    pub fuel_kg: f64,
    pub vertical_speed: f64,
    pub on_ground: bool,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulatorStatus {
    pub simulator_type: Option<SimulatorType>,
    pub simulator_selected: bool,
    pub fsuipc_connected: bool,
    #[serde(default)]
    pub simconnect_connected: bool,
    pub xpuipc_connected: bool,
    pub data_running: bool,
}

pub struct SimulatorConnection {
    simulator_type: Arc<Mutex<Option<SimulatorType>>>,
    fsuipc: Arc<Mutex<Option<fsuipc::FsuipcConnection>>>,
    #[cfg(windows)]
    simconnect: Arc<Mutex<Option<simconnect::SimConnectConnection>>>,
    xpuipc: Arc<Mutex<Option<xpuipc::XpuipcConnection>>>,
    callback: Arc<Mutex<Option<Box<dyn Fn(FlightData) + Send + Sync>>>>,
    flight_plan: Arc<Mutex<Option<StoredFlightPlan>>>,
}

impl SimulatorConnection {
    pub fn new() -> Self {
        Self {
            simulator_type: Arc::new(Mutex::new(None)),
            fsuipc: Arc::new(Mutex::new(None)),
            #[cfg(windows)]
            simconnect: Arc::new(Mutex::new(None)),
            xpuipc: Arc::new(Mutex::new(None)),
            callback: Arc::new(Mutex::new(None)),
            flight_plan: Arc::new(Mutex::new(None)),
        }
    }

    pub fn connect(&mut self, sim_type: SimulatorType) -> Result<(), String> {
        self.disconnect();

        *self.simulator_type.lock().unwrap() = Some(sim_type);

        match sim_type {
            SimulatorType::MSFS => {
                #[cfg(windows)]
                {
                    let mut simconnect_conn = simconnect::SimConnectConnection::new();
                    let callback_clone = self.callback.clone();
                    let plan_clone = self.flight_plan.clone();
                    simconnect_conn.set_callback(move |mut data| {
                        if let Ok(plan_guard) = plan_clone.lock() {
                            if let Some(ref plan) = *plan_guard {
                                if data.departure_icao.trim().is_empty() {
                                    if let Some(ref v) = plan.departure_icao {
                                        data.departure_icao = v.clone();
                                    }
                                }
                                if data.arrival_icao.trim().is_empty() {
                                    if let Some(ref v) = plan.arrival_icao {
                                        data.arrival_icao = v.clone();
                                    }
                                }
                                if data.callsign.trim().is_empty() || data.callsign == "UNKNOWN" {
                                    if let Some(ref v) = plan.callsign {
                                        data.callsign = v.clone();
                                    }
                                }
                                if data.aircraft_icao.trim().is_empty() || data.aircraft_icao == "UNKN" {
                                    if let Some(ref v) = plan.aircraft_icao {
                                        data.aircraft_icao = v.chars().take(4).collect();
                                    }
                                }
                            }
                        }
                        if let Ok(cb_guard) = callback_clone.lock() {
                            if let Some(ref cb) = *cb_guard {
                                cb(data);
                            }
                        }
                    });
                    simconnect_conn.connect()?;
                    *self.simconnect.lock().unwrap() = Some(simconnect_conn);
                    Ok(())
                }
                #[cfg(not(windows))]
                Err("SimConnect (MSFS) is only supported on Windows.".to_string())
            }
            SimulatorType::FSX | SimulatorType::P3D => {
                let mut fsuipc_conn = fsuipc::FsuipcConnection::new();
                let callback_clone = self.callback.clone();
                let plan_clone = self.flight_plan.clone();
                fsuipc_conn.set_callback(move |mut data| {
                    if let Ok(plan_guard) = plan_clone.lock() {
                        if let Some(ref plan) = *plan_guard {
                            if data.departure_icao.trim().is_empty() {
                                if let Some(ref v) = plan.departure_icao {
                                    data.departure_icao = v.clone();
                                }
                            }
                            if data.arrival_icao.trim().is_empty() {
                                if let Some(ref v) = plan.arrival_icao {
                                    data.arrival_icao = v.clone();
                                }
                            }
                            if data.callsign.trim().is_empty() || data.callsign == "UNKNOWN" {
                                if let Some(ref v) = plan.callsign {
                                    data.callsign = v.clone();
                                }
                            }
                            if data.aircraft_icao.trim().is_empty() || data.aircraft_icao == "UNKN" {
                                if let Some(ref v) = plan.aircraft_icao {
                                    data.aircraft_icao = v.chars().take(4).collect();
                                }
                            }
                        }
                    }
                    if let Ok(cb_guard) = callback_clone.lock() {
                        if let Some(ref cb) = *cb_guard {
                            cb(data);
                        }
                    }
                });
                fsuipc_conn.connect()?;
                *self.fsuipc.lock().unwrap() = Some(fsuipc_conn);
                Ok(())
            }
            SimulatorType::XPLANE => {
                let mut xpuipc_conn = xpuipc::XpuipcConnection::new(49000);
                
                // Set up callback to forward to our callback (and enrich with plan)
                let callback_clone = self.callback.clone();
                let plan_clone = self.flight_plan.clone();
                xpuipc_conn.set_callback(move |mut data| {
                    if let Ok(plan_guard) = plan_clone.lock() {
                        if let Some(ref plan) = *plan_guard {
                            if data.departure_icao.trim().is_empty() {
                                if let Some(ref v) = plan.departure_icao {
                                    data.departure_icao = v.clone();
                                }
                            }
                            if data.arrival_icao.trim().is_empty() {
                                if let Some(ref v) = plan.arrival_icao {
                                    data.arrival_icao = v.clone();
                                }
                            }
                            if data.callsign.trim().is_empty() || data.callsign == "UNKNOWN" {
                                if let Some(ref v) = plan.callsign {
                                    data.callsign = v.clone();
                                }
                            }
                            if data.aircraft_icao.trim().is_empty() || data.aircraft_icao == "UNKN" {
                                if let Some(ref v) = plan.aircraft_icao {
                                    data.aircraft_icao = v.chars().take(4).collect();
                                }
                            }
                        }
                    }

                    if let Ok(cb_guard) = callback_clone.lock() {
                        if let Some(ref cb) = *cb_guard {
                            cb(data);
                        }
                    }
                });

                xpuipc_conn.connect()?;
                *self.xpuipc.lock().unwrap() = Some(xpuipc_conn);
                Ok(())
            }
        }
    }

    pub fn start(&mut self) -> Result<(), String> {
        let sim_type = self.simulator_type.lock().unwrap()
            .ok_or("No simulator connected")?;

        match sim_type {
            SimulatorType::MSFS => {
                #[cfg(windows)]
                {
                    if let Some(ref mut sc) = *self.simconnect.lock().unwrap() {
                        sc.start()
                    } else {
                        Err("SimConnect not connected".to_string())
                    }
                }
                #[cfg(not(windows))]
                Err("SimConnect is only supported on Windows.".to_string())
            }
            SimulatorType::FSX | SimulatorType::P3D => {
                if let Some(ref mut fsuipc_conn) = *self.fsuipc.lock().unwrap() {
                    fsuipc_conn.start()
                } else {
                    Err("FSUIPC not connected".to_string())
                }
            }
            SimulatorType::XPLANE => {
                if let Some(ref mut xpuipc_conn) = *self.xpuipc.lock().unwrap() {
                    xpuipc_conn.start()
                } else {
                    Err("XPUIPC not connected".to_string())
                }
            }
        }
    }

    pub fn stop(&mut self) {
        #[cfg(windows)]
        {
            if let Some(ref mut sc) = *self.simconnect.lock().unwrap() {
                sc.stop();
            }
        }
        if let Some(ref mut fsuipc_conn) = *self.fsuipc.lock().unwrap() {
            fsuipc_conn.stop();
        }
        if let Some(ref mut xpuipc_conn) = *self.xpuipc.lock().unwrap() {
            xpuipc_conn.stop();
        }
    }

    pub fn disconnect(&mut self) {
        self.stop();
        *self.simulator_type.lock().unwrap() = None;
        *self.fsuipc.lock().unwrap() = None;
        #[cfg(windows)]
        {
            *self.simconnect.lock().unwrap() = None;
        }
        *self.xpuipc.lock().unwrap() = None;
    }

    pub fn set_callback<F>(&mut self, callback: F)
    where
        F: Fn(FlightData) + Send + Sync + 'static,
    {
        *self.callback.lock().unwrap() = Some(Box::new(callback));
    }

    pub fn is_connected(&self) -> bool {
        self.simulator_type.lock().unwrap().is_some()
    }

    pub fn get_simulator_type(&self) -> Option<SimulatorType> {
        *self.simulator_type.lock().unwrap()
    }

    pub fn set_flight_plan(&mut self, plan: Option<StoredFlightPlan>) {
        *self.flight_plan.lock().unwrap() = plan;
    }

    pub fn get_flight_plan(&self) -> Option<StoredFlightPlan> {
        self.flight_plan.lock().unwrap().clone()
    }

    pub fn get_status(&self) -> SimulatorStatus {
        let sim_type = *self.simulator_type.lock().unwrap();

        let (fsuipc_connected, fsuipc_running) = self
            .fsuipc
            .lock()
            .ok()
            .and_then(|g| g.as_ref().map(|c| (c.is_connected(), c.is_running())))
            .unwrap_or((false, false));

        #[cfg(windows)]
        let (simconnect_connected, simconnect_running) = self
            .simconnect
            .lock()
            .ok()
            .and_then(|g| g.as_ref().map(|c| (c.is_connected(), c.is_running())))
            .unwrap_or((false, false));

        #[cfg(not(windows))]
        let (simconnect_connected, simconnect_running) = (false, false);

        let (xpuipc_connected, xpuipc_running) = self
            .xpuipc
            .lock()
            .ok()
            .and_then(|g| g.as_ref().map(|c| (c.is_connected(), c.is_running())))
            .unwrap_or((false, false));

        SimulatorStatus {
            simulator_type: sim_type,
            simulator_selected: sim_type.is_some(),
            fsuipc_connected,
            simconnect_connected,
            xpuipc_connected,
            data_running: fsuipc_running || simconnect_running || xpuipc_running,
        }
    }
}

impl Default for SimulatorConnection {
    fn default() -> Self {
        Self::new()
    }
}
