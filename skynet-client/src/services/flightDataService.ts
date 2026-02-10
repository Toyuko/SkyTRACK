/**
 * FlightDataService
 * 
 * TypeScript service class for fetching real-time flight telemetry.
 * Primary: WebSocket via Laravel Reverb (sub-second latency)
 * Fallback: REST polling every 1s when WebSocket is unavailable.
 */

export interface TelemetryData {
  callsign: string;
  aircraft_icao: string;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  ias: number;
  ground_speed: number;
  vertical_speed: number;
  fuel_kg: number;
  on_ground: boolean;
  sim_time?: string;
  simulator: 'MSFS' | 'P3D' | 'FSX' | 'XPLANE';
  departure_icao?: string;
  arrival_icao?: string;
  flight_phase?: string;
  timestamp: number;
  server_timestamp?: string;
}

type TelemetryHandler = (data: TelemetryData) => void;
type ConnectionHandler = (status: 'connected' | 'disconnected' | 'error') => void;

export class FlightDataService {
  private wsUrl: string;
  private apiUrl: string;
  private ws: WebSocket | null = null;
  private telemetryHandlers = new Set<TelemetryHandler>();
  private connectionHandlers = new Set<ConnectionHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private connected = false;
  private destroyed = false;

  private readonly RECONNECT_MS = 3000;
  private readonly POLL_MS = 1000;

  constructor(
    wsUrl = 'ws://localhost:8080/app/skytrack-key',
    apiUrl = 'http://localhost:8000/api'
  ) {
    this.wsUrl = wsUrl;
    this.apiUrl = apiUrl;
  }

  /**
   * Start the service — connect WebSocket, fall back to polling.
   */
  start(): void {
    this.destroyed = false;
    this.connectWebSocket();
  }

  /**
   * Stop the service — close WebSocket, stop polling.
   */
  stop(): void {
    this.destroyed = true;
    this.disconnectWebSocket();
    this.stopPolling();
  }

  /**
   * Subscribe to telemetry updates.
   */
  onTelemetry(handler: TelemetryHandler): () => void {
    this.telemetryHandlers.add(handler);
    return () => this.telemetryHandlers.delete(handler);
  }

  /**
   * Subscribe to connection status changes.
   */
  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  /**
   * Fetch all active flights via REST (one-shot).
   */
  async fetchCurrentFlights(): Promise<TelemetryData[]> {
    try {
      const resp = await fetch(`${this.apiUrl}/telemetry/current`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      return json.flights ?? [];
    } catch (err) {
      console.error('[FlightDataService] REST fetch error:', err);
      return [];
    }
  }

  /**
   * Fetch a specific flight by callsign.
   */
  async fetchFlight(callsign: string): Promise<TelemetryData | null> {
    try {
      const resp = await fetch(`${this.apiUrl}/telemetry/${encodeURIComponent(callsign)}`);
      if (!resp.ok) return null;
      const json = await resp.json();
      return json.flight ?? null;
    } catch {
      return null;
    }
  }

  // ─── WebSocket (Laravel Reverb) ───

  private connectWebSocket(): void {
    if (this.destroyed || this.ws) return;

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[FlightDataService] WebSocket connected');
        this.connected = true;
        this.notifyConnection('connected');
        this.stopPolling();

        // Subscribe to the 'flights' channel (Reverb protocol)
        this.ws?.send(JSON.stringify({
          event: 'pusher:subscribe',
          data: { channel: 'flights' },
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Handle Reverb/Pusher protocol events
          if (msg.event === 'telemetry.updated' && msg.data) {
            const data: TelemetryData = typeof msg.data === 'string'
              ? JSON.parse(msg.data)
              : msg.data;
            this.notifyTelemetry(data);
          }
        } catch (err) {
          console.error('[FlightDataService] WS message parse error:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[FlightDataService] WebSocket closed');
        this.ws = null;
        this.connected = false;
        this.notifyConnection('disconnected');
        this.scheduleReconnect();
        this.startPolling(); // fallback to REST
      };

      this.ws.onerror = () => {
        this.notifyConnection('error');
      };
    } catch (err) {
      console.error('[FlightDataService] WS connect error:', err);
      this.scheduleReconnect();
      this.startPolling();
    }
  }

  private disconnectWebSocket(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  private scheduleReconnect(): void {
    if (this.destroyed || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebSocket();
    }, this.RECONNECT_MS);
  }

  // ─── REST Polling Fallback ───

  private startPolling(): void {
    if (this.pollTimer || this.destroyed) return;
    console.log('[FlightDataService] Falling back to REST polling');

    this.pollTimer = setInterval(async () => {
      if (this.connected) {
        this.stopPolling();
        return;
      }
      const flights = await this.fetchCurrentFlights();
      flights.forEach((f) => this.notifyTelemetry(f));
    }, this.POLL_MS);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // ─── Notify ───

  private notifyTelemetry(data: TelemetryData): void {
    this.telemetryHandlers.forEach((h) => {
      try { h(data); } catch (e) { console.error('[FlightDataService] handler error:', e); }
    });
  }

  private notifyConnection(status: 'connected' | 'disconnected' | 'error'): void {
    this.connectionHandlers.forEach((h) => {
      try { h(status); } catch (e) { console.error('[FlightDataService] handler error:', e); }
    });
  }
}

// Singleton
let _instance: FlightDataService | null = null;

export function getFlightDataService(): FlightDataService {
  if (!_instance) {
    _instance = new FlightDataService();
  }
  return _instance;
}
