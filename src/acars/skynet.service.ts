import { SkyNetAcarsData, validateAcarsData, safeValidateAcarsData } from './skynet.schema';
import { FlightPhase } from './flightPhase';

/**
 * SkyNet ACARS Service
 * Handles validation and normalization of ACARS data from various simulator clients
 */
export class SkyNetAcarsService {
  /**
   * Validate and normalize incoming ACARS data
   * @param rawData Raw ACARS data from client
   * @returns Normalized SkyNet ACARS data
   * @throws Error if validation fails
   */
  validateAndNormalize(rawData: unknown): SkyNetAcarsData {
    try {
      return validateAcarsData(rawData);
    } catch (error) {
      throw new Error(`[SkyNet] ACARS validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Safe validation that returns a result instead of throwing
   * @param rawData Raw ACARS data from client
   * @returns Validation result
   */
  safeValidateAndNormalize(rawData: unknown): {
    success: boolean;
    data?: SkyNetAcarsData;
    error?: string;
  } {
    const result = safeValidateAcarsData(rawData);
    if (result.success && result.data) {
      return { success: true, data: result.data };
    }
    return {
      success: false,
      error: result.error?.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ') || 'Unknown validation error',
    };
  }

  /**
   * Normalize flight phase to ensure it's a valid enum value
   * @param phase Raw flight phase value
   * @returns Normalized flight phase or default
   */
  normalizeFlightPhase(phase: unknown): FlightPhase {
    if (typeof phase === 'string' && Object.values(FlightPhase).includes(phase as FlightPhase)) {
      return phase as FlightPhase;
    }
    // Default to PREFLIGHT if invalid
    return FlightPhase.PREFLIGHT;
  }

  /**
   * Ensure timestamp is in ISO UTC format
   * @param timestamp Raw timestamp value
   * @returns ISO UTC timestamp string
   */
  normalizeTimestamp(timestamp: unknown): string {
    if (typeof timestamp === 'string') {
      // Try to parse and reformat to ensure ISO format
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    // Default to current time if invalid
    return new Date().toISOString();
  }

  /**
   * Normalize ICAO codes to uppercase and validate length
   * @param icao Raw ICAO code
   * @returns Normalized ICAO code
   */
  normalizeIcao(icao: unknown): string {
    if (typeof icao === 'string') {
      const normalized = icao.trim().toUpperCase();
      if (normalized.length === 4) {
        return normalized;
      }
    }
    throw new Error(`[SkyNet] Invalid ICAO code: ${icao}`);
  }

  /**
   * Normalize callsign to uppercase
   * @param callsign Raw callsign
   * @returns Normalized callsign
   */
  normalizeCallsign(callsign: unknown): string {
    if (typeof callsign === 'string') {
      return callsign.trim().toUpperCase();
    }
    throw new Error(`[SkyNet] Invalid callsign: ${callsign}`);
  }
}

// Export singleton instance
export const skynetAcarsService = new SkyNetAcarsService();
