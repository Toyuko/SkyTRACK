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

  constructor() {
    this.setupEventListener();
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
   * Notify all message handlers
   */
  private notifyMessageHandlers(data: SkyNetAcarsSnapshot): void {
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
  get cleanup() { return getSimulatorService().cleanup.bind(getSimulatorService()); },
};
