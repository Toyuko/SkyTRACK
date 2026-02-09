use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SimbriefPlan {
    pub username: String,
    pub callsign: Option<String>,
    pub aircraft_icao: Option<String>,
    pub departure_icao: Option<String>,
    pub arrival_icao: Option<String>,
    pub route: Option<String>,
    pub ofp_id: Option<String>,
    pub created_at: Option<String>,
}

// SimBrief's JSON structure is large; we only deserialize what we use.
#[derive(Debug, Deserialize)]
struct SimbriefResponse {
    #[serde(default)]
    general: General,
    #[serde(default)]
    aircraft: Aircraft,
    #[serde(default)]
    origin: Airport,
    #[serde(default)]
    destination: Airport,
    #[serde(default)]
    atc: Atc,
}

#[derive(Debug, Deserialize, Default)]
struct General {
    #[serde(default)]
    route: Option<String>,
    #[serde(default)]
    ofp_id: Option<String>,
    #[serde(default)]
    created: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
struct Aircraft {
    #[serde(default)]
    icao_code: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
struct Airport {
    #[serde(default)]
    icao_code: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
struct Atc {
    #[serde(default)]
    callsign: Option<String>,
}

fn norm_icao(s: Option<String>) -> Option<String> {
    s.and_then(|v| {
        let t = v.trim().to_uppercase();
        if t.is_empty() { None } else { Some(t) }
    })
}

fn norm_str(s: Option<String>) -> Option<String> {
    s.and_then(|v| {
        let t = v.trim().to_string();
        if t.is_empty() { None } else { Some(t) }
    })
}

/// Fetch latest OFP for a SimBrief `username` (aka "pilot name").
///
/// Uses SimBrief's public fetcher endpoint with `json=1`.
pub async fn fetch_plan_by_username(username: &str) -> Result<SimbriefPlan, String> {
    let username_trimmed = username.trim();
    if username_trimmed.is_empty() {
        return Err("SimBrief username is required".to_string());
    }

    let url = format!(
        "https://www.simbrief.com/api/xml.fetcher.php?json=1&username={}",
        urlencoding::encode(username_trimmed)
    );

    let client = reqwest::Client::new();
    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("SimBrief request failed: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("SimBrief request failed: HTTP {}", resp.status()));
    }

    let body = resp
        .json::<SimbriefResponse>()
        .await
        .map_err(|e| format!("Failed to parse SimBrief response: {e}"))?;

    Ok(SimbriefPlan {
        username: username_trimmed.to_string(),
        callsign: norm_str(body.atc.callsign),
        aircraft_icao: norm_icao(body.aircraft.icao_code),
        departure_icao: norm_icao(body.origin.icao_code),
        arrival_icao: norm_icao(body.destination.icao_code),
        route: norm_str(body.general.route),
        ofp_id: norm_str(body.general.ofp_id),
        created_at: norm_str(body.general.created),
    })
}

