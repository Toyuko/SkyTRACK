import { PhpVmsClient } from './phpvms.client';
import { PhpVmsPirepRequest, PhpVmsPirep, VaConfig } from './phpvms.types';
import { SkyNetAcarsData } from '../acars/skynet.schema';
import { FlightPosition } from '../flights/flight.model';
import { FlightPhase } from '../acars/flightPhase';

/**
 * phpVMS PIREP Service
 * Handles pilot validation, flight validation, and PIREP submission
 */
export class PhpVmsPirepService {
  private client: PhpVmsClient;
  private vaConfig: VaConfig;

  constructor(vaConfig: VaConfig) {
    this.vaConfig = vaConfig;
    this.client = new PhpVmsClient(vaConfig);
  }

  /**
   * Validate pilot exists and is active
   * @param userId User ID or 'me' for current authenticated user
   * @returns True if pilot is valid
   */
  async validatePilot(userId: string | number = 'me'): Promise<boolean> {
    return await this.client.validatePilot(userId);
  }

  /**
   * Validate flight exists and is available
   * @param flightId Flight ID
   * @returns True if flight is valid
   */
  async validateFlight(flightId: number): Promise<boolean> {
    return await this.client.validateFlight(flightId);
  }

  /**
   * Validate bid exists for user
   * @param userId User ID
   * @param flightId Flight ID
   * @returns True if bid exists
   */
  async validateBid(userId: string | number, flightId: number): Promise<boolean> {
    return await this.client.validateBid(userId, flightId);
  }

  /**
   * Calculate flight time in minutes from position updates
   * @param positions Array of flight positions
   * @returns Flight time in minutes
   */
  private calculateFlightTime(positions: FlightPosition[]): number {
    if (positions.length < 2) {
      return 0;
    }

    const firstPosition = positions[0];
    const lastPosition = positions[positions.length - 1];
    const timeDiffMs = lastPosition.timestamp.getTime() - firstPosition.timestamp.getTime();
    return Math.round(timeDiffMs / 1000 / 60); // Convert to minutes
  }

  /**
   * Calculate block time (from engine start to engine stop)
   * This is a simplified calculation - in production, you'd track engine state
   * @param positions Array of flight positions
   * @returns Block time in minutes
   */
  private calculateBlockTime(positions: FlightPosition[]): number {
    // Find first position where aircraft is moving (not PREFLIGHT)
    const firstMovingIndex = positions.findIndex(
      (p) => p.flightPhase !== FlightPhase.PREFLIGHT && p.groundSpeed > 0
    );
    
    // Find last position before LANDED/BLOCKED
    const lastActiveIndex = positions.findLastIndex(
      (p) => p.flightPhase !== FlightPhase.LANDED && p.flightPhase !== FlightPhase.BLOCKED
    );

    if (firstMovingIndex === -1 || lastActiveIndex === -1 || firstMovingIndex >= lastActiveIndex) {
      return this.calculateFlightTime(positions);
    }

    const startTime = positions[firstMovingIndex].timestamp;
    const endTime = positions[lastActiveIndex].timestamp;
    const timeDiffMs = endTime.getTime() - startTime.getTime();
    return Math.round(timeDiffMs / 1000 / 60); // Convert to minutes
  }

  /**
   * Calculate distance flown (simplified - uses great circle distance)
   * @param positions Array of flight positions
   * @returns Distance in nautical miles
   */
  private calculateDistance(positions: FlightPosition[]): number {
    if (positions.length < 2) {
      return 0;
    }

    let totalDistance = 0;
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];
      totalDistance += this.haversineDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
    }

    return Math.round(totalDistance);
  }

  /**
   * Calculate great circle distance between two points (Haversine formula)
   * @param lat1 Latitude of first point
   * @param lon1 Longitude of first point
   * @param lat2 Latitude of second point
   * @param lon2 Longitude of second point
   * @returns Distance in nautical miles
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3440; // Earth radius in nautical miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Transform SkyNet ACARS data and flight positions to phpVMS PIREP format
   * @param latestData Latest ACARS data
   * @param positions Array of flight positions for the flight
   * @param userId User ID (optional, will use 'me' if not provided)
   * @param flightId Flight ID (optional, for bid validation)
   * @returns PIREP request data
   */
  async preparePirep(
    latestData: SkyNetAcarsData,
    positions: FlightPosition[],
    userId?: string | number,
    flightId?: number
  ): Promise<PhpVmsPirepRequest> {
    const flightTime = this.calculateFlightTime(positions);
    const blockTime = this.calculateBlockTime(positions);
    const distance = this.calculateDistance(positions);

    // Calculate landing rate (simplified - would need vertical speed data in production)
    // TODO: Implement proper landing rate calculation from vertical speed
    const landingRate = null;

    // Calculate score (simplified - would need more data in production)
    // TODO: Implement proper scoring based on flight parameters
    const score = null;

    const pirepData: PhpVmsPirepRequest = {
      dep_airport_id: latestData.departureIcao,
      arr_airport_id: latestData.arrivalIcao,
      route: `${latestData.departureIcao}-${latestData.arrivalIcao}`,
      route_code: latestData.callsign,
      distance: distance,
      flight_time: flightTime,
      block_time: blockTime,
      fuel_used: latestData.fuelKg ? Math.round(latestData.fuelKg * 0.33) : null, // Convert kg to gallons (approximate)
      landing_rate: landingRate,
      score: score,
      status: 'PENDING',
      flight_date: new Date(latestData.timestamp).toISOString().split('T')[0],
      submitted_at: new Date().toISOString(),
    };

    // Add optional fields if provided
    if (userId) {
      pirepData.user_id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    }

    if (flightId) {
      pirepData.flight_id = flightId;
    }

    // TODO: Add aircraft_id mapping if available
    // pirepData.aircraft_id = aircraftId;

    return pirepData;
  }

  /**
   * Submit PIREP at flight end
   * @param latestData Latest ACARS data
   * @param positions Array of flight positions for the flight
   * @param userId User ID (optional)
   * @param flightId Flight ID (optional)
   * @returns Submitted PIREP
   */
  async submitPirep(
    latestData: SkyNetAcarsData,
    positions: FlightPosition[],
    userId?: string | number,
    flightId?: number
  ): Promise<PhpVmsPirep> {
    // Validate pilot if userId provided
    if (userId) {
      const isValidPilot = await this.validatePilot(userId);
      if (!isValidPilot) {
        throw new Error(`[SkyNet] Invalid pilot: ${userId}`);
      }
    }

    // Validate flight/bid if flightId provided
    if (flightId && userId) {
      const hasBid = await this.validateBid(userId, flightId);
      if (!hasBid) {
        throw new Error(`[SkyNet] No active bid found for flight ${flightId}`);
      }
    }

    // Prepare PIREP data
    const pirepData = await this.preparePirep(latestData, positions, userId, flightId);

    // Submit PIREP
    try {
      const pirep = await this.client.submitPirep(pirepData);
      console.log(`[SkyNet] PIREP submitted successfully: ${pirep.id}`);
      return pirep;
    } catch (error) {
      console.error('[SkyNet] Failed to submit PIREP:', error);
      throw error;
    }
  }
}
