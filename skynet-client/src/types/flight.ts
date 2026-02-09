/**
 * Flight booking types
 */

export interface BookedFlight {
  type: 'booked';
  flightId: number;
  callsign: string;
  aircraftIcao: string;
  departureIcao: string;
  arrivalIcao: string;
  route: string;
  distance: number;
  flightTime: number;
  bookedAt: string;
}

export interface FreeFlight {
  type: 'free';
  callsign: string;
  aircraftIcao: string;
  departureIcao: string;
  arrivalIcao: string;
  createdAt: string;
}

export type CurrentFlight = BookedFlight | FreeFlight | null;

/**
 * phpVMS Flight (from API)
 */
export interface PhpVmsFlight {
  id: number;
  airline_id: number;
  flight_number: string;
  route: string;
  route_code: string;
  route_leg: string;
  dep_airport_id: string;
  arr_airport_id: string;
  distance: number;
  flight_time: number;
  flight_type: string;
  aircraft_id: number;
  aircraft: {
    id: number;
    icao: string;
    name: string;
  } | null;
  dep_airport: {
    id: string;
    icao: string;
    name: string;
  } | null;
  arr_airport: {
    id: string;
    icao: string;
    name: string;
  } | null;
}

/**
 * phpVMS Bid
 */
export interface PhpVmsBid {
  id: number;
  user_id: number;
  flight_id: number;
  flight: PhpVmsFlight;
}

/**
 * Flight search parameters
 */
export interface FlightSearchParams {
  dep_airport_id?: string;
  arr_airport_id?: string;
  aircraft_id?: number;
  flight_number?: string;
  page?: number;
  per_page?: number;
}

/**
 * phpVMS API configuration
 */
export interface PhpVmsConfig {
  baseUrl: string;
  apiToken: string;
  enabled: boolean;
}
