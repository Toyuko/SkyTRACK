/**
 * Flight Information Region (FIR) types
 */

export interface FIRZone {
  /** FIR identifier (e.g., "KZLA", "EGTT", "LFFF") */
  id: string;
  /** FIR name (e.g., "Los Angeles Center", "London FIR") */
  name: string;
  /** Country or region */
  country: string;
  /** ICAO code */
  icao: string;
  /** Polygon coordinates defining the FIR boundary [longitude, latitude] */
  boundary: [number, number][];
  /** Center point of the FIR [longitude, latitude] */
  center: [number, number];
  /** Minimum altitude (feet) - optional */
  minAltitude?: number;
  /** Maximum altitude (feet) - optional */
  maxAltitude?: number;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function pointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Find which FIR zone contains a given point
 */
export function findFIRForPosition(
  latitude: number,
  longitude: number,
  firZones: FIRZone[]
): FIRZone | null {
  const point: [number, number] = [longitude, latitude];

  for (const fir of firZones) {
    if (pointInPolygon(point, fir.boundary)) {
      return fir;
    }
  }

  return null;
}
