/**
 * Flight Information Region (FIR) zone definitions
 * Simplified boundaries for major FIR zones
 * Note: These are approximate boundaries for visualization purposes
 */

import { FIRZone } from '../types/fir';

/**
 * Major FIR zones with simplified polygon boundaries
 * Coordinates are [longitude, latitude]
 */
export const firZones: FIRZone[] = [
  // United States - West Coast
  {
    id: 'KZLA',
    name: 'Los Angeles Center',
    country: 'United States',
    icao: 'KZLA',
    center: [-118.0, 34.0],
    boundary: [
      [-125.0, 32.0],
      [-125.0, 42.0],
      [-115.0, 42.0],
      [-115.0, 36.0],
      [-118.0, 32.0],
      [-125.0, 32.0],
    ],
  },
  // United States - East Coast
  {
    id: 'KZNY',
    name: 'New York Center',
    country: 'United States',
    icao: 'KZNY',
    center: [-74.0, 40.5],
    boundary: [
      [-80.0, 38.0],
      [-80.0, 45.0],
      [-68.0, 45.0],
      [-68.0, 38.0],
      [-80.0, 38.0],
    ],
  },
  // United States - Central
  {
    id: 'KZAU',
    name: 'Chicago Center',
    country: 'United States',
    icao: 'KZAU',
    center: [-88.0, 41.5],
    boundary: [
      [-95.0, 38.0],
      [-95.0, 46.0],
      [-82.0, 46.0],
      [-82.0, 38.0],
      [-95.0, 38.0],
    ],
  },
  // United Kingdom
  {
    id: 'EGTT',
    name: 'London FIR',
    country: 'United Kingdom',
    icao: 'EGTT',
    center: [-0.5, 51.5],
    boundary: [
      [-6.0, 49.0],
      [-6.0, 55.0],
      [2.0, 55.0],
      [2.0, 49.0],
      [-6.0, 49.0],
    ],
  },
  // France
  {
    id: 'LFFF',
    name: 'Paris FIR',
    country: 'France',
    icao: 'LFFF',
    center: [2.3, 48.9],
    boundary: [
      [-5.0, 42.0],
      [-5.0, 51.5],
      [8.0, 51.5],
      [8.0, 42.0],
      [-5.0, 42.0],
    ],
  },
  // Germany
  {
    id: 'EDMM',
    name: 'Munich FIR',
    country: 'Germany',
    icao: 'EDMM',
    center: [11.6, 48.1],
    boundary: [
      [5.0, 47.0],
      [5.0, 50.0],
      [15.0, 50.0],
      [15.0, 47.0],
      [5.0, 47.0],
    ],
  },
  // Spain
  {
    id: 'LEMM',
    name: 'Madrid FIR',
    country: 'Spain',
    icao: 'LEMM',
    center: [-3.6, 40.4],
    boundary: [
      [-10.0, 36.0],
      [-10.0, 44.0],
      [3.0, 44.0],
      [3.0, 36.0],
      [-10.0, 36.0],
    ],
  },
  // Italy
  {
    id: 'LIMM',
    name: 'Milano FIR',
    country: 'Italy',
    icao: 'LIMM',
    center: [9.2, 45.5],
    boundary: [
      [6.0, 36.0],
      [6.0, 47.0],
      [19.0, 47.0],
      [19.0, 36.0],
      [6.0, 36.0],
    ],
  },
  // Netherlands/Belgium
  {
    id: 'EHAA',
    name: 'Amsterdam FIR',
    country: 'Netherlands',
    icao: 'EHAA',
    center: [4.9, 52.4],
    boundary: [
      [2.0, 50.0],
      [2.0, 54.0],
      [7.0, 54.0],
      [7.0, 50.0],
      [2.0, 50.0],
    ],
  },
  // Switzerland
  {
    id: 'LSAS',
    name: 'Switzerland FIR',
    country: 'Switzerland',
    icao: 'LSAS',
    center: [8.5, 47.0],
    boundary: [
      [5.5, 45.5],
      [5.5, 48.0],
      [10.5, 48.0],
      [10.5, 45.5],
      [5.5, 45.5],
    ],
  },
  // Canada - Toronto
  {
    id: 'CZYZ',
    name: 'Toronto Center',
    country: 'Canada',
    icao: 'CZYZ',
    center: [-79.4, 43.7],
    boundary: [
      [-90.0, 41.0],
      [-90.0, 50.0],
      [-70.0, 50.0],
      [-70.0, 41.0],
      [-90.0, 41.0],
    ],
  },
  // Australia - Sydney
  {
    id: 'YBBB',
    name: 'Brisbane Center',
    country: 'Australia',
    icao: 'YBBB',
    center: [153.0, -27.5],
    boundary: [
      [145.0, -30.0],
      [145.0, -24.0],
      [160.0, -24.0],
      [160.0, -30.0],
      [145.0, -30.0],
    ],
  },
  // Japan - Tokyo
  {
    id: 'RJTG',
    name: 'Tokyo FIR',
    country: 'Japan',
    icao: 'RJTG',
    center: [139.8, 35.7],
    boundary: [
      [125.0, 30.0],
      [125.0, 42.0],
      [145.0, 42.0],
      [145.0, 30.0],
      [125.0, 30.0],
    ],
  },
  // China - Beijing
  {
    id: 'ZBPE',
    name: 'Beijing FIR',
    country: 'China',
    icao: 'ZBPE',
    center: [116.4, 39.9],
    boundary: [
      [110.0, 35.0],
      [110.0, 45.0],
      [125.0, 45.0],
      [125.0, 35.0],
      [110.0, 35.0],
    ],
  },
  // UAE - Dubai
  {
    id: 'OMAE',
    name: 'Dubai FIR',
    country: 'United Arab Emirates',
    icao: 'OMAE',
    center: [55.3, 25.2],
    boundary: [
      [50.0, 22.0],
      [50.0, 28.0],
      [60.0, 28.0],
      [60.0, 22.0],
      [50.0, 22.0],
    ],
  },
  // Brazil - São Paulo
  {
    id: 'SBSP',
    name: 'São Paulo FIR',
    country: 'Brazil',
    icao: 'SBSP',
    center: [-46.6, -23.6],
    boundary: [
      [-52.0, -26.0],
      [-52.0, -20.0],
      [-42.0, -20.0],
      [-42.0, -26.0],
      [-52.0, -26.0],
    ],
  },
  // Russia - Moscow
  {
    id: 'UUWV',
    name: 'Moscow FIR',
    country: 'Russia',
    icao: 'UUWV',
    center: [37.6, 55.8],
    boundary: [
      [25.0, 50.0],
      [25.0, 60.0],
      [45.0, 60.0],
      [45.0, 50.0],
      [25.0, 50.0],
    ],
  },
  // India - Mumbai
  {
    id: 'VABB',
    name: 'Mumbai FIR',
    country: 'India',
    icao: 'VABB',
    center: [72.9, 19.1],
    boundary: [
      [68.0, 15.0],
      [68.0, 23.0],
      [78.0, 23.0],
      [78.0, 15.0],
      [68.0, 15.0],
    ],
  },
  // South Africa - Johannesburg
  {
    id: 'FAJO',
    name: 'Johannesburg FIR',
    country: 'South Africa',
    icao: 'FAJO',
    center: [28.0, -26.2],
    boundary: [
      [15.0, -30.0],
      [15.0, -22.0],
      [35.0, -22.0],
      [35.0, -30.0],
      [15.0, -30.0],
    ],
  },
];

/**
 * Get FIR zone by ICAO code
 */
export function getFIRByICAO(icao: string): FIRZone | undefined {
  return firZones.find((fir) => fir.icao.toUpperCase() === icao.toUpperCase());
}

/**
 * Get all FIR zones
 */
export function getAllFIRZones(): FIRZone[] {
  return firZones;
}
