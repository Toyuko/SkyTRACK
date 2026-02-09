// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod simulator;
mod simbrief;

use simulator::{FlightData, SimulatorConnection, SimulatorStatus, SimulatorType, StoredFlightPlan};
use std::sync::Mutex;
use tauri::{State, Manager};

// Global simulator connection state
type SimulatorState = Mutex<SimulatorConnection>;

#[tauri::command]
fn connect_simulator(
    sim_type: String,
    app: tauri::AppHandle,
    state: State<SimulatorState>,
) -> Result<String, String> {
    let sim_type_enum = match sim_type.as_str() {
        "MSFS" => SimulatorType::MSFS,
        "FSX" => SimulatorType::FSX,
        "P3D" => SimulatorType::P3D,
        "XPLANE" => SimulatorType::XPLANE,
        _ => return Err("Invalid simulator type".to_string()),
    };

    let app_handle = app.clone();
    let mut conn = state.lock().unwrap();
    
    // Set up callback to emit flight data events
    let app_handle_clone = app_handle.clone();
    conn.set_callback(move |data: FlightData| {
        let flight_data_json = serde_json::to_string(&data).unwrap_or_default();
        let _ = app_handle_clone.emit_all("simulator-flight-data", flight_data_json);
    });
    
    conn.connect(sim_type_enum)?;
    // Emit updated status
    if let Ok(status_json) = serde_json::to_string(&conn.get_status()) {
        let _ = app_handle.emit_all("simulator-status", status_json);
    }
    Ok(format!("Connected to {:?}", sim_type_enum))
}

#[tauri::command]
fn disconnect_simulator(app: tauri::AppHandle, state: State<SimulatorState>) -> Result<String, String> {
    let mut conn = state.lock().unwrap();
    conn.disconnect();
    if let Ok(status_json) = serde_json::to_string(&conn.get_status()) {
        let _ = app.emit_all("simulator-status", status_json);
    }
    Ok("Disconnected".to_string())
}

#[tauri::command]
fn start_simulator(app: tauri::AppHandle, state: State<SimulatorState>) -> Result<String, String> {
    let mut conn = state.lock().unwrap();
    conn.start()?;
    if let Ok(status_json) = serde_json::to_string(&conn.get_status()) {
        let _ = app.emit_all("simulator-status", status_json);
    }
    Ok("Started".to_string())
}

#[tauri::command]
fn stop_simulator(app: tauri::AppHandle, state: State<SimulatorState>) -> Result<String, String> {
    let mut conn = state.lock().unwrap();
    conn.stop();
    if let Ok(status_json) = serde_json::to_string(&conn.get_status()) {
        let _ = app.emit_all("simulator-status", status_json);
    }
    Ok("Stopped".to_string())
}

#[tauri::command]
fn is_simulator_connected(state: State<SimulatorState>) -> bool {
    state.lock().unwrap().is_connected()
}

#[tauri::command]
fn get_simulator_status(state: State<SimulatorState>) -> SimulatorStatus {
    state.lock().unwrap().get_status()
}

#[tauri::command]
fn get_simulator_type(state: State<SimulatorState>) -> Option<String> {
    state.lock().unwrap().get_simulator_type().map(|st| {
        match st {
            SimulatorType::MSFS => "MSFS".to_string(),
            SimulatorType::FSX => "FSX".to_string(),
            SimulatorType::P3D => "P3D".to_string(),
            SimulatorType::XPLANE => "XPLANE".to_string(),
        }
    })
}

#[tauri::command]
async fn fetch_simbrief_plan(
    username: String,
    app: tauri::AppHandle,
    state: State<'_, SimulatorState>,
) -> Result<simbrief::SimbriefPlan, String> {
    let plan = simbrief::fetch_plan_by_username(&username).await?;

    let stored = StoredFlightPlan {
        callsign: plan.callsign.clone(),
        aircraft_icao: plan.aircraft_icao.clone(),
        departure_icao: plan.departure_icao.clone(),
        arrival_icao: plan.arrival_icao.clone(),
        route: plan.route.clone(),
        source: Some("simbrief".to_string()),
    };

    let mut conn = state.lock().unwrap();
    conn.set_flight_plan(Some(stored));
    if let Ok(status_json) = serde_json::to_string(&conn.get_status()) {
        let _ = app.emit_all("simulator-status", status_json);
    }

    Ok(plan)
}

#[tauri::command]
fn clear_flight_plan(app: tauri::AppHandle, state: State<SimulatorState>) -> Result<String, String> {
    let mut conn = state.lock().unwrap();
    conn.set_flight_plan(None);
    if let Ok(status_json) = serde_json::to_string(&conn.get_status()) {
        let _ = app.emit_all("simulator-status", status_json);
    }
    Ok("Flight plan cleared".to_string())
}

#[tauri::command]
fn get_flight_plan(state: State<SimulatorState>) -> Option<StoredFlightPlan> {
    state.lock().unwrap().get_flight_plan()
}

fn main() {
    let simulator_connection = SimulatorConnection::new();
    
    tauri::Builder::default()
        .manage(SimulatorState::new(simulator_connection))
        .invoke_handler(tauri::generate_handler![
            connect_simulator,
            disconnect_simulator,
            start_simulator,
            stop_simulator,
            is_simulator_connected,
            get_simulator_status,
            get_simulator_type,
            fetch_simbrief_plan,
            clear_flight_plan,
            get_flight_plan,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
