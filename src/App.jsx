import './App.css'

function App() {
  return (
    <div className="acars-app">
      {/* Top navigation bar */}
      <header className="acars-topbar">
        <div className="topbar-left">
          <div className="logo-mark" />
          <span className="logo-text">SkyTRACK</span>
        </div>

        <nav className="topbar-nav">
          <button className="nav-item nav-item-active">ACARS</button>
          <button className="nav-item">View Live Map</button>
          <button className="nav-item">Search &amp; Book</button>
          <button className="nav-item">Free Flight</button>
        </nav>

        <div className="topbar-right">
          <div className="status-pills">
            <span className="status-pill status-pill-danger">ERROR</span>
            <span className="status-pill">SC</span>
            <span className="status-pill">FSUIPC</span>
            <span className="status-pill">XPUIPC</span>
            <span className="status-pill">DATA</span>
          </div>
          <button className="settings-button" aria-label="Settings">
            ⚙
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="acars-main">
        <section className="acars-grid">
          {/* Left column: Route origin */}
          <div className="acars-column acars-column-left">
            <div className="column-label">DEPARTURE</div>
            <div className="airport-code">KJFK</div>
            <div className="airport-subtitle">New York – John F. Kennedy</div>
          </div>

          {/* Middle column: Telemetry */}
          <div className="acars-column acars-column-center">
            <div className="telemetry-header">
              <span className="telemetry-title">FLIGHT TELEMETRY</span>
              <div className="mode-toggle">
                <span>CLIMB</span>
                <div className="mode-toggle-switch">
                  <div className="mode-toggle-knob" />
                </div>
              </div>
            </div>

            <div className="telemetry-grid">
              <div className="telemetry-item">
                <div className="telemetry-label">ALTITUDE</div>
                <div className="telemetry-value telemetry-value-altitude">
                  3,301 <span className="telemetry-unit">ft</span>
                </div>
              </div>
              <div className="telemetry-item">
                <div className="telemetry-label">GROUND SPEED</div>
                <div className="telemetry-value telemetry-value-speed">
                  216 <span className="telemetry-unit">kt</span>
                </div>
              </div>
              <div className="telemetry-item">
                <div className="telemetry-label">HEADING</div>
                <div className="telemetry-value telemetry-value-heading">
                  088<span className="telemetry-unit">°</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Route destination + technical status */}
          <div className="acars-column acars-column-right">
            <div className="arrival-block">
              <div className="column-label column-label-right">ARRIVAL</div>
              <div className="airport-code airport-code-right">KLAX</div>
              <div className="airport-subtitle airport-subtitle-right">
                Los Angeles – LAX
              </div>
              <div className="eta-chip">ETA 12:30 UTC</div>
            </div>

            <div className="status-block">
              <div className="status-label">FUEL REMAINING</div>
              <div className="status-value status-value-fuel">
                19,981 <span className="status-unit">kg</span>
              </div>

              <div className="status-meta">
                <div className="status-meta-item">
                  <span className="status-meta-label">CALLSIGN</span>
                  <span className="status-meta-value">UAL123</span>
                </div>
                <div className="status-meta-item">
                  <span className="status-meta-label">AIRCRAFT</span>
                  <span className="status-meta-value">B738</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Route progress bar spanning columns */}
        <section className="route-progress">
          <div className="route-bar">
            <div className="route-bar-track">
              {Array.from({ length: 18 }).map((_, index) => (
                <span key={index} className="route-segment" />
              ))}
            </div>
            <div className="route-plane" />
          </div>
        </section>

        {/* Center-bottom map widget */}
        <section className="map-section">
          <div className="map-widget">
            <div className="map-header">
              <span className="map-title">ROUTE OVERVIEW</span>
              <div className="map-controls">
                <button className="map-control">–</button>
                <button className="map-control">+</button>
              </div>
            </div>
            <div className="map-body">
              <div className="map-glow" />
              <svg
                className="map-svg"
                viewBox="0 0 400 220"
                aria-hidden="true"
              >
                <rect
                  x="0"
                  y="0"
                  width="400"
                  height="220"
                  className="map-background-rect"
                />
                <path
                  d="M60 150 C 120 80, 260 80, 340 140"
                  className="map-route-line"
                />
                <circle cx="60" cy="150" r="4" className="map-waypoint" />
                <circle cx="340" cy="140" r="4" className="map-waypoint" />
                <text x="40" y="165" className="map-label">
                  KJFK
                </text>
                <text x="320" y="130" className="map-label">
                  KLAX
                </text>
                <polygon
                  className="map-plane-icon"
                  points="190,120 215,110 215,118 240,118 240,122 215,122 215,130"
                />
              </svg>
            </div>
          </div>
        </section>
      </main>

      {/* ACARS message log footer */}
      <footer className="acars-footer">
        <div className="footer-left">
          <span className="footer-indicator-dot" />
          <span className="footer-indicator-label">Mock Data Mode</span>
          <span className="footer-separator">•</span>
          <span className="footer-timestamp">Last update: 7:13:15 PM</span>
        </div>
        <div className="footer-log">
          <div className="footer-log-track">
            <span className="footer-log-entry">
              2023-07-08 07:13:37 ZEE04 &nbsp; Departure &gt; ACARS text message:
              PUSHBACK COMPLETE. TAXI TO RWY 04L.
            </span>
            <span className="footer-log-entry">
              2023-07-08 07:13:45 ZEE04 &nbsp; ATC &gt; ACARS text message: CLIMB
              FL350, DIRECT DCT BETTE.
            </span>
            <span className="footer-log-entry">
              2023-07-08 07:13:52 ZEE04 &nbsp; SYSTEM &gt; ACARS text message:
              POSITION REPORT SENT TO SKYTRACK HUB.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
