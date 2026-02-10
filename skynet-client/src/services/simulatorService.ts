import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { SkyNetAcarsSnapshot } from '../types/acars';

type SimulatorType = 'MSFS' | 'FSX' | 'P3D' | 'XPLANE';
type MessageHandler = (data: SkyNetAcarsSnapshot) => void;
type StatusHandler = (status: 'connected' | 'disconnected' | 'error') => void;
type DetailedStatus = {
  simulator_type: SimulatorType | null;
  simulator_selected: boolean;
  fsuipc_connected: boolean;
  simconnect_connected?: boolean;
  xpuipc_connected: boolean;
  data_running: boolean;
};
type DetailedStatusHandler = (status: DetailedStatus) => void;

/**
 * Simulator Service
 * Handles connection to flight simulators via FSUIPC/XPUIPC
 * and relays live data to the SkyNet backend via WebSocket
 */
export class SimulatorService {
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private detailedStatusHandlers: Set<DetailedStatusHandler> = new Set();
  private isConnected: boolean = false;
  private eventUnlisten: (() => void) | null = null;
  private statusUnlisten: (() => void) | null = null;
  private detailedStatus: DetailedStatus = {
    simulator_type: null,
    simulator_selected: false,
    fsuipc_connected: false,
    simconnect_connected: false,
    xpuipc_connected: false,
    data_running: false,
  };
  private lastEmitTime = 0;
  private readonly THROTTLE_MS = 500;
  private pendingData: SkyNetAcarsSnapshot | null = null;
  private throttleTimer: ReturnType<typeof setTimeout> | null = null;

  // WebSocket relay to SkyNet backend for live tracking
  private relayWs: WebSocket | null = null;
  private relayUrl: string = 'ws://localhost:3000/ws/skynet:flights';
  private relayEnabled: boolean = true;
  private relayReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly RELAY_RECONNECT_MS = 5000;
  // Separate throttle for backend relay (send every 2s to avoid overloading DB)
  private lastRelayTime = 0;
  private readonly RELAY_THROTTLE_MS = 2000;

  constructor() {
    this.setupEventListener();
  }

  /**
   * Configure the WebSocket relay URL for backend sync
   */
  setRelayUrl(url: string): void {
    this.relayUrl = url;
    // Reconnect if already connected
    if (this.relayWs) {
      this.disconnectRelay();
      this.connectRelay();
    }
  }

  /**
   * Enable/disable live relay to backend
   */
  setRelayEnabled(enabled: boolean): void {
    this.relayEnabled = enabled;
    if (!enabled) {
      this.disconnectRelay();
    } else if (this.isConnected) {
      this.connectRelay();
    }
  }

  /**
   * Connect WebSocket relay to SkyNet backend
   */
  private connectRelay(): void {
    if (!this.relayEnabled || this.relayWs?.readyState === WebSocket.OPEN) return;

    try {
      this.relayWs = new WebSocket(this.relayUrl);

      this.relayWs.onopen = () => {
        console.log('[Simulator] Backend relay connected:', this.relayUrl);
      };

      this.relayWs.onclose = () => {
        console.log('[Simulator] Backend relay disconnected');
        this.relayWs = null;
        this.scheduleRelayReconnect();
      };

      this.relayWs.onerror = (err) => {
        console.error('[Simulator] Backend relay error:', err);
      };
    } catch (error) {
      console.error('[Simulator] Failed to connect relay:', error);
      this.scheduleRelayReconnect();
    }
  }

  /**
   * Disconnect WebSocket relay
   */
  private disconnectRelay(): void {
    if (this.relayReconnectTimer) {
      clearTimeout(this.relayReconnectTimer);
      this.relayReconnectTimer = null;
    }
    if (this.relayWs) {
      this.relayWs.onclose = null; // prevent reconnect
      this.relayWs.close();
      this.relayWs = null;
    }
  }

  /**
   * Schedule relay reconnection
   */
  private scheduleRelayReconnect(): void {
    if (!this.relayEnabled || this.relayReconnectTimer) return;
    this.relayReconnectTimer = setTimeout(() => {
      this.relayReconnectTimer = null;
      if (this.relayEnabled && this.isConnected) {
        this.connectRelay();
      }
    }, this.RELAY_RECONNECT_MS);
  }

  /**
   * Relay ACARS data to backend (throttled)
   */
  private relayToBackend(data: SkyNetAcarsSnapshot): void {
    if (!this.relayEnabled || !this.relayWs || this.relayWs.readyState !== WebSocket.OPEN) return;

    const now = Date.now();
    if (now - this.lastRelayTime < this.RELAY_THROTTLE_MS) return;
    this.lastRelayTime = now;

    try {
      // Send in SkyNet ACARS schema format with simulator field
      const payload = {
        ...data,
        simulator: this.detailedStatus.simulator_type || 'MSFS',
      };
      this.relayWs.send(JSON.stringify(payload));
    } catch (error) {
      console.error('[Simulator] Failed to relay data to backend:', error);
    }
  }

  /**
   * Set up Tauri event listener for flight data.
   * Throttle to 4 Hz max - FSUIPC emits at 10 Hz which overwhelms React and causes "Not Responding".
   */
  private async setupEventListener() {
    try {
      const unlisten = await listen<string>('simulator-flight-data', (event) => {
        try {
          const flightData = JSON.parse(event.payload);
          const acarsData = this.convertToAcarsSnapshot(flightData);
          const now = Date.now();
          if (now - this.lastEmitTime >= this.THROTTLE_MS) {
            this.lastEmitTime = now;
            this.pendingData = null;
            if (this.throttleTimer) {
              clearTimeout(this.throttleTimer);
              this.throttleTimer = null;
            }
            this.notifyMessageHandlers(acarsData);
          } else {
            this.pendingData = acarsData;
            if (!this.throttleTimer) {
              this.throttleTimer = setTimeout(() => {
                this.throttleTimer = null;
                if (this.pendingData) {
                  this.lastEmitTime = Date.now();
                  const data = this.pendingData;
                  this.pendingData = null;
                  this.notifyMessageHandlers(data);
                }
              }, this.THROTTLE_MS - (now - this.lastEmitTime));
            }
          }
        } catch (error) {
          console.error('[Simulator] Failed to parse flight data:', error);
        }
      });
      this.eventUnlisten = unlisten;

      const unlistenStatus = await listen<any>('simulator-status', (event) => {
        // Payload might arrive as JSON string (emit_all) or as an object (invoke)
        try {
          const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
          this.setDetailedStatus(payload as DetailedStatus);
        } catch (error) {
          console.error('[Simulator] Failed to parse simulator status:', error);
        }
      });
      this.statusUnlisten = unlistenStatus;
    } catch (error) {
      console.error('[Simulator] Failed to set up event listener:', error);
    }
  }

  private setDetailedStatus(status: DetailedStatus) {
    this.detailedStatus = status;
    this.detailedStatusHandlers.forEach((handler) => {
      try {
        handler(status);
      } catch (error) {
        console.error('[Simulator] Error in detailed status handler:', error);
      }
    });
  }

  /**
   * Convert Rust FlightData to SkyNetAcarsSnapshot
   */
  private convertToAcarsSnapshot(flightData: any): SkyNetAcarsSnapshot {
    // Determine flight phase based on altitude and ground speed
    const flightPhase = this.determineFlightPhase(
      flightData.altitude,
      flightData.groundSpeed,
      flightData.onGround,
      flightData.verticalSpeed
    );

    return {
      callsign: flightData.callsign || 'UNKNOWN',
      aircraftIcao: flightData.aircraft_icao || 'UNKN',
      departureIcao: flightData.departure_icao || '',
      arrivalIcao: flightData.arrival_icao || '',
      latitude: flightData.latitude,
      longitude: flightData.longitude,
      altitude: flightData.altitude,
      groundSpeed: flightData.ground_speed,
      heading: flightData.heading,
      fuelKg: flightData.fuel_kg,
      flightPhase,
      timestamp: flightData.timestamp || new Date().toISOString(),
    };
  }

  /**
   * Determine flight phase from flight data
   */
  private determineFlightPhase(
    altitude: number,
    groundSpeed: number,
    onGround: boolean,
    verticalSpeed: number
  ): string {
    if (onGround) {
      if (groundSpeed < 5) {
        return 'PREFLIGHT';
      } else if (groundSpeed < 30) {
        return 'TAXI';
      } else {
        return 'TAKEOFF';
      }
    } else {
      if (altitude < 1000) {
        return 'TAKEOFF';
      } else if (verticalSpeed > 500) {
        return 'CLIMB';
      } else if (verticalSpeed < -500) {
        return 'DESCENT';
      } else {
        return 'CRUISE';
      }
    }
  }

  /**
   * Connect to simulator
   */
  async connect(simType: SimulatorType): Promise<void> {
    try {
      await invoke('connect_simulator', { simType });
      this.isConnected = true;
      this.notifyStatusHandlers('connected');

      // Start backend relay for live tracking
      this.connectRelay();

      // Prime detailed status after connect
      try {
        const status = await invoke<DetailedStatus>('get_simulator_status');
        this.setDetailedStatus(status);
      } catch (e) {
        // ignore
      }
    } catch (error) {
      console.error('[Simulator] Failed to connect:', error);
      this.isConnected = false;
      this.notifyStatusHandlers('error');
      throw error;
    }
  }

  /**
   * Disconnect from simulator
   */
  async disconnect(): Promise<void> {
    try {
      await invoke('disconnect_simulator');
      this.isConnected = false;
      this.notifyStatusHandlers('disconnected');

      // Stop backend relay
      this.disconnectRelay();

      // Refresh status after disconnect
      try {
        const status = await invoke<DetailedStatus>('get_simulator_status');
        this.setDetailedStatus(status);
      } catch (e) {
        // ignore
      }
    } catch (error) {
      console.error('[Simulator] Failed to disconnect:', error);
    }
  }

  /**
   * Start simulator data collection
   */
  async start(): Promise<void> {
    try {
      await invoke('start_simulator');

      // Refresh status after start
      try {
        const status = await invoke<DetailedStatus>('get_simulator_status');
        this.setDetailedStatus(status);
      } catch (e) {
        // ignore
      }
    } catch (error) {
      console.error('[Simulator] Failed to start:', error);
      throw error;
    }
  }

  /**
   * Stop simulator data collection
   */
  async stop(): Promise<void> {
    try {
      await invoke('stop_simulator');

      // Refresh status after stop
      try {
        const status = await invoke<DetailedStatus>('get_simulator_status');
        this.setDetailedStatus(status);
      } catch (e) {
        // ignore
      }
    } catch (error) {
      console.error('[Simulator] Failed to stop:', error);
    }
  }

  /**
   * Check if simulator is connected
   */
  async isSimulatorConnected(): Promise<boolean> {
    try {
      return await invoke('is_simulator_connected');
    } catch (error) {
      console.error('[Simulator] Failed to check connection status:', error);
      return false;
    }
  }

  /**
   * Get current simulator type
   */
  async getSimulatorType(): Promise<SimulatorType | null> {
    try {
      return await invoke('get_simulator_type');
    } catch (error) {
      console.error('[Simulator] Failed to get simulator type:', error);
      return null;
    }
  }

  /**
   * Register message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Register status change handler
   */
  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    // Immediately call with current status
    handler(this.isConnected ? 'connected' : 'disconnected');
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  /**
   * Register detailed simulator status handler (FSUIPC/XPUIPC/running)
   */
  onDetailedStatusChange(handler: DetailedStatusHandler): () => void {
    this.detailedStatusHandlers.add(handler);
    handler(this.detailedStatus);
    return () => {
      this.detailedStatusHandlers.delete(handler);
    };
  }

  /**
   * Notify all message handlers and relay to backend
   */
  private notifyMessageHandlers(data: SkyNetAcarsSnapshot): void {
    // Relay live data to SkyNet backend for persistence and broadcast
    this.relayToBackend(data);

    this.messageHandlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error('[Simulator] Error in message handler:', error);
      }
    });
  }

  /**
   * Notify all status handlers
   */
  private notifyStatusHandlers(status: 'connected' | 'disconnected' | 'error'): void {
    this.statusHandlers.forEach((handler) => {
      try {
        handler(status);
      } catch (error) {
        console.error('[Simulator] Error in status handler:', error);
      }
    });
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    this.pendingData = null;
    this.disconnectRelay();
    if (this.eventUnlisten) {
      this.eventUnlisten();
      this.eventUnlisten = null;
    }
    if (this.statusUnlisten) {
      this.statusUnlisten();
      this.statusUnlisten = null;
    }
    this.messageHandlers.clear();
    this.statusHandlers.clear();
    this.detailedStatusHandlers.clear();
  }
}

// Lazy singleton - only create when needed to avoid blocking startup (Tauri listen setup)
let _instance: SimulatorService | null = null;
export function getSimulatorService(): SimulatorService {
  if (!_instance) _instance = new SimulatorService();
  return _instance;
}
export const simulatorService = {
  get connect() { return getSimulatorService().connect.bind(getSimulatorService()); },
  get disconnect() { return getSimulatorService().disconnect.bind(getSimulatorService()); },
  get start() { return getSimulatorService().start.bind(getSimulatorService()); },
  get stop() { return getSimulatorService().stop.bind(getSimulatorService()); },
  get onMessage() { return getSimulatorService().onMessage.bind(getSimulatorService()); },
  get onStatusChange() { return getSimulatorService().onStatusChange.bind(getSimulatorService()); },
  get onDetailedStatusChange() { return getSimulatorService().onDetailedStatusChange.bind(getSimulatorService()); },
  get setRelayUrl() { return getSimulatorService().setRelayUrl.bind(getSimulatorService()); },
  get setRelayEnabled() { return getSimulatorService().setRelayEnabled.bind(getSimulatorService()); },
  get cleanup() { return getSimulatorService().cleanup.bind(getSimulatorService()); },
};
