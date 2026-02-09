import { SkyNetAcarsSnapshot } from '../types/acars';

/**
 * Mock ACARS data generator
 * Simulates flight data for testing when backend is not available
 */
export class MockDataGenerator {
  private phaseIndex: number = 0;
  private phaseStartTime: number = Date.now();
  private altitude: number = 0;
  private groundSpeed: number = 0;
  private latitude: number = 40.7128; // NYC
  private longitude: number = -74.0060;
  private heading: number = 90;
  private fuelKg: number = 20000;

  private phases = ['PREFLIGHT', 'TAXI', 'TAKEOFF', 'CLIMB', 'CRUISE'];
  private phaseDurations = [5000, 10000, 15000, 30000, Infinity]; // milliseconds

  /**
   * Generate next mock ACARS snapshot
   */
  generate(): SkyNetAcarsSnapshot {
    const now = Date.now();
    const timeInPhase = now - this.phaseStartTime;
    const currentPhase = this.phases[this.phaseIndex];

    // Check if we should transition to next phase
    if (
      this.phaseIndex < this.phases.length - 1 &&
      timeInPhase > this.phaseDurations[this.phaseIndex]
    ) {
      this.phaseIndex++;
      this.phaseStartTime = now;
    }

    // Update flight parameters based on phase
    this.updateFlightParameters();

    return {
      callsign: 'UAL123',
      aircraftIcao: 'B738',
      departureIcao: 'KJFK',
      arrivalIcao: 'KLAX',
      latitude: this.latitude,
      longitude: this.longitude,
      altitude: this.altitude,
      groundSpeed: this.groundSpeed,
      heading: this.heading,
      fuelKg: this.fuelKg,
      flightPhase: this.phases[this.phaseIndex],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update flight parameters based on current phase
   */
  private updateFlightParameters(): void {
    const phase = this.phases[this.phaseIndex];
    const now = Date.now();
    const timeInPhase = (now - this.phaseStartTime) / 1000; // seconds

    switch (phase) {
      case 'PREFLIGHT':
        this.altitude = 0;
        this.groundSpeed = 0;
        this.heading = 90;
        break;

      case 'TAXI':
        this.altitude = 0;
        this.groundSpeed = Math.min(25 + Math.random() * 10, 35);
        this.heading = 90 + (Math.random() - 0.5) * 20;
        break;

      case 'TAKEOFF':
        this.altitude = Math.min(timeInPhase * 50, 1500);
        this.groundSpeed = Math.min(40 + timeInPhase * 10, 180);
        this.heading = 90;
        this.fuelKg = Math.max(this.fuelKg - timeInPhase * 0.1, 19500);
        break;

      case 'CLIMB':
        this.altitude = Math.min(1500 + timeInPhase * 100, 35000);
        this.groundSpeed = Math.min(180 + timeInPhase * 2, 250);
        this.heading = 90 + (Math.random() - 0.5) * 5;
        this.latitude += (Math.random() - 0.5) * 0.001;
        this.longitude += 0.01; // Moving west
        this.fuelKg = Math.max(this.fuelKg - timeInPhase * 0.15, 18000);
        break;

      case 'CRUISE':
        this.altitude = 35000 + (Math.random() - 0.5) * 500;
        this.groundSpeed = 450 + (Math.random() - 0.5) * 20;
        this.heading = 90 + (Math.random() - 0.5) * 10;
        this.latitude += (Math.random() - 0.5) * 0.002;
        this.longitude += 0.02; // Moving west
        this.fuelKg = Math.max(this.fuelKg - timeInPhase * 0.1, 15000);
        break;
    }

    // Normalize heading to 0-360
    this.heading = ((this.heading % 360) + 360) % 360;
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.phaseIndex = 0;
    this.phaseStartTime = Date.now();
    this.altitude = 0;
    this.groundSpeed = 0;
    this.latitude = 40.7128;
    this.longitude = -74.0060;
    this.heading = 90;
    this.fuelKg = 20000;
  }
}

// Export singleton instance
export const mockDataGenerator = new MockDataGenerator();
