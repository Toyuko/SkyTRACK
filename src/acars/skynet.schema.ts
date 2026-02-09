import { z } from 'zod';
import { FlightPhase } from './flightPhase';

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
 * Zod schema for SkyNet ACARS data
 * This is the normalized schema that all simulator data must conform to
 */
export const skynetAcarsSchema = z.object({
  /**
   * Aircraft callsign (e.g., "UAL123", "DLH456")
   */
  callsign: z.string().min(1).max(10).toUpperCase(),

  /**
   * Simulator type
   */
  simulator: z.nativeEnum(Simulator),

  /**
   * Aircraft ICAO type code (e.g., "B738", "A320")
   */
  aircraftIcao: z.string().length(4).toUpperCase(),

  /**
   * Departure airport ICAO code (e.g., "KJFK", "EGLL")
   */
  departureIcao: z.string().length(4).toUpperCase(),

  /**
   * Arrival airport ICAO code (e.g., "KLAX", "LFPG")
   */
  arrivalIcao: z.string().length(4).toUpperCase(),

  /**
   * Current latitude in decimal degrees
   */
  latitude: z.number().min(-90).max(90),

  /**
   * Current longitude in decimal degrees
   */
  longitude: z.number().min(-180).max(180),

  /**
   * Current altitude in feet above sea level
   */
  altitude: z.number().min(-1000).max(100000),

  /**
   * Ground speed in knots
   */
  groundSpeed: z.number().min(0).max(2000),

  /**
   * Current heading in degrees (0-360)
   */
  heading: z.number().min(0).max(360),

  /**
   * Current fuel quantity in kilograms
   */
  fuelKg: z.number().min(0),

  /**
   * Current flight phase
   */
  flightPhase: z.nativeEnum(FlightPhase),

  /**
   * Timestamp in ISO 8601 UTC format
   */
  timestamp: z.string().datetime(),

  /**
   * Vertical speed in feet per minute (optional - may be missing)
   */
  verticalSpeed: z.number().optional(),

  /**
   * Whether aircraft is on ground (optional - may be missing, will be inferred)
   */
  onGround: z.boolean().optional(),
});

/**
 * TypeScript type inferred from the Zod schema
 */
export type SkyNetAcarsData = z.infer<typeof skynetAcarsSchema>;

/**
 * ACARS snapshot for flight phase detection
 * Contains all fields needed for phase detection, with optional fields that may be missing
 */
export interface AcarsSnapshot {
  altitude: number; // feet MSL
  groundSpeed: number; // knots
  verticalSpeed?: number; // feet/min (optional - may be missing)
  onGround?: boolean; // optional - will be inferred if missing
  timestamp: string; // ISO UTC string
}

/**
 * Validate ACARS data against the SkyNet schema
 * @param data Raw ACARS data to validate
 * @returns Validated and normalized SkyNet ACARS data
 * @throws ZodError if validation fails
 */
export function validateAcarsData(data: unknown): SkyNetAcarsData {
  return skynetAcarsSchema.parse(data);
}

/**
 * Safe validation that returns a result instead of throwing
 * @param data Raw ACARS data to validate
 * @returns Validation result with success flag and data/error
 */
export function safeValidateAcarsData(data: unknown): {
  success: boolean;
  data?: SkyNetAcarsData;
  error?: z.ZodError;
} {
  const result = skynetAcarsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
