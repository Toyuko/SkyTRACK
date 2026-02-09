/**
 * FIR (Flight Information Region) service
 * Provides utilities for working with FIR zones
 */

import { FIRZone, findFIRForPosition } from '../types/fir';
import { firZones } from '../data/firZones';

export interface FIRService {
  /**
   * Find which FIR zone contains a given position
   */
  findFIR(latitude: number, longitude: number): FIRZone | null;

  /**
   * Get FIR zone by ICAO code
   */
  getFIRByICAO(icao: string): FIRZone | undefined;

  /**
   * Get all FIR zones
   */
  getAllFIRZones(): FIRZone[];

  /**
   * Get FIR zones visible in a viewport
   */
  getFIRZonesInViewport(
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    }
  ): FIRZone[];
}

class FIRServiceImpl implements FIRService {
  findFIR(latitude: number, longitude: number): FIRZone | null {
    return findFIRForPosition(latitude, longitude, firZones);
  }

  getFIRByICAO(icao: string): FIRZone | undefined {
    return firZones.find((fir) => fir.icao.toUpperCase() === icao.toUpperCase());
  }

  getAllFIRZones(): FIRZone[] {
    return firZones;
  }

  getFIRZonesInViewport(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): FIRZone[] {
    // Return FIRs whose center point is within the viewport
    // or whose boundary intersects the viewport
    return firZones.filter((fir) => {
      const [lon, lat] = fir.center;
      
      // Check if center is in viewport
      if (
        lat >= bounds.south &&
        lat <= bounds.north &&
        lon >= bounds.west &&
        lon <= bounds.east
      ) {
        return true;
      }

      // Check if any boundary point is in viewport
      return fir.boundary.some(([lon, lat]) => {
        return (
          lat >= bounds.south &&
          lat <= bounds.north &&
          lon >= bounds.west &&
          lon <= bounds.east
        );
      });
    });
  }
}

export const firService = new FIRServiceImpl();
