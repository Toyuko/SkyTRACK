/**
 * Simulator types supported by SkyNet ACARS
 */
export enum Simulator {
  MSFS = 'MSFS',
  FSX = 'FSX',
  P3D = 'P3D',
  XPLANE = 'XPLANE',
}

/**
 * SkyNet ACARS Snapshot
 * Matches the SkyNet backend schema
 */
export interface SkyNetAcarsSnapshot {
  callsign: string;
  aircraftIcao: string;
  departureIcao: string;
  arrivalIcao: string;
  latitude: number;
  longitude: number;
  altitude: number;
  groundSpeed: number;
  heading: number;
  fuelKg: number;
  flightPhase: string;
  timestamp: string;
}

/**
 * WebSocket message types
 */
export interface WebSocketMessage {
  type: 'connected' | 'position_update' | 'system' | 'error';
  channel?: string;
  data?: SkyNetAcarsSnapshot;
  message?: string;
  error?: string;
}

/**
 * Connection status
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
