// WebSocket functionality for Tauri backend
// Currently minimal - WebSocket connections are handled in the frontend
// This file is reserved for future native WebSocket handling if needed

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct WebSocketConfig {
    pub url: String,
    pub auto_reconnect: bool,
}

impl Default for WebSocketConfig {
    fn default() -> Self {
        Self {
            url: "ws://localhost:3000/ws/skynet:flights".to_string(),
            auto_reconnect: true,
        }
    }
}
