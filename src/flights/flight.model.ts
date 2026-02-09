import { SkyNetAcarsData } from '../acars/skynet.schema';
import { FlightPhase } from '../acars/flightPhase';

/**
 * Flight position update record stored in database
 */
export interface FlightPosition {
  id: number;
  callsign: string;
  simulator: string;
  aircraftIcao: string;
  departureIcao: string;
  arrivalIcao: string;
  latitude: number;
  longitude: number;
  altitude: number;
  groundSpeed: number;
  heading: number;
  fuelKg: number;
  flightPhase: FlightPhase;
  timestamp: Date;
  createdAt: Date;
}

/**
 * Flight summary record (aggregated flight data)
 */
export interface FlightSummary {
  callsign: string;
  simulator: string;
  aircraftIcao: string;
  departureIcao: string;
  arrivalIcao: string;
  startTime: Date;
  endTime: Date | null;
  totalDistance: number | null;
  flightDuration: number | null; // in seconds
  maxAltitude: number;
  maxGroundSpeed: number;
  finalFlightPhase: FlightPhase;
}

/**
 * Database row type for flight_positions table
 */
export interface FlightPositionRow {
  id: number;
  callsign: string;
  simulator: string;
  aircraft_icao: string;
  departure_icao: string;
  arrival_icao: string;
  latitude: number;
  longitude: number;
  altitude: number;
  ground_speed: number;
  heading: number;
  fuel_kg: number;
  flight_phase: string;
  timestamp: Date;
  created_at: Date;
}

/**
 * Convert database row to FlightPosition model
 */
export function rowToFlightPosition(row: FlightPositionRow): FlightPosition {
  return {
    id: row.id,
    callsign: row.callsign,
    simulator: row.simulator,
    aircraftIcao: row.aircraft_icao,
    departureIcao: row.departure_icao,
    arrivalIcao: row.arrival_icao,
    latitude: row.latitude,
    longitude: row.longitude,
    altitude: row.altitude,
    groundSpeed: row.ground_speed,
    heading: row.heading,
    fuelKg: row.fuel_kg,
    flightPhase: row.flight_phase as FlightPhase,
    timestamp: row.timestamp,
    createdAt: row.created_at,
  };
}

/**
 * Convert SkyNet ACARS data to database insert parameters
 */
export function acarsDataToInsertParams(data: SkyNetAcarsData): {
  callsign: string;
  simulator: string;
  aircraft_icao: string;
  departure_icao: string;
  arrival_icao: string;
  latitude: number;
  longitude: number;
  altitude: number;
  ground_speed: number;
  heading: number;
  fuel_kg: number;
  flight_phase: string;
  timestamp: Date;
} {
  return {
    callsign: data.callsign,
    simulator: data.simulator,
    aircraft_icao: data.aircraftIcao,
    departure_icao: data.departureIcao,
    arrival_icao: data.arrivalIcao,
    latitude: data.latitude,
    longitude: data.longitude,
    altitude: data.altitude,
    ground_speed: data.groundSpeed,
    heading: data.heading,
    fuel_kg: data.fuelKg,
    flight_phase: data.flightPhase,
    timestamp: new Date(data.timestamp),
  };
}
