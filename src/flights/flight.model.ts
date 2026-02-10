import { WithId } from 'mongodb';
import { SkyNetAcarsData } from '../acars/skynet.schema';
import { FlightPhase } from '../acars/flightPhase';

/**
 * Flight position update record stored in database
 */
export interface FlightPosition {
  id: string;
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
 * MongoDB document type for flight_positions collection
 */
export interface FlightPositionDoc {
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
  flightPhase: string;
  timestamp: Date;
  createdAt: Date;
}

/**
 * Convert MongoDB document to FlightPosition model
 */
export function docToFlightPosition(doc: WithId<FlightPositionDoc>): FlightPosition {
  return {
    id: doc._id.toHexString(),
    callsign: doc.callsign,
    simulator: doc.simulator,
    aircraftIcao: doc.aircraftIcao,
    departureIcao: doc.departureIcao,
    arrivalIcao: doc.arrivalIcao,
    latitude: doc.latitude,
    longitude: doc.longitude,
    altitude: doc.altitude,
    groundSpeed: doc.groundSpeed,
    heading: doc.heading,
    fuelKg: doc.fuelKg,
    flightPhase: doc.flightPhase as FlightPhase,
    timestamp: doc.timestamp,
    createdAt: doc.createdAt,
  };
}

/**
 * Convert SkyNet ACARS data to MongoDB insert document
 */
export function acarsDataToDoc(data: SkyNetAcarsData): FlightPositionDoc {
  return {
    callsign: data.callsign,
    simulator: data.simulator,
    aircraftIcao: data.aircraftIcao,
    departureIcao: data.departureIcao,
    arrivalIcao: data.arrivalIcao,
    latitude: data.latitude,
    longitude: data.longitude,
    altitude: data.altitude,
    groundSpeed: data.groundSpeed,
    heading: data.heading,
    fuelKg: data.fuelKg,
    flightPhase: data.flightPhase,
    timestamp: new Date(data.timestamp),
    createdAt: new Date(),
  };
}
