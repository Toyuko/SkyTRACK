/**
 * phpVMS 7 API Types
 * TypeScript interfaces for phpVMS 7 API responses and requests
 */

/**
 * phpVMS API user/pilot response
 */
export interface PhpVmsUser {
  id: number;
  pilot_id: string;
  name: string;
  email: string;
  rank_id: number;
  rank: {
    id: number;
    name: string;
  } | null;
  home_airport_id: string | null;
  current_airport_id: string | null;
  flights_count: number;
  hours: number;
  avatar: string | null;
}

/**
 * phpVMS API flight/bid response
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
 * phpVMS API bid response
 */
export interface PhpVmsBid {
  id: number;
  user_id: number;
  flight_id: number;
  flight: PhpVmsFlight;
}

/**
 * phpVMS API PIREP submission request
 */
export interface PhpVmsPirepRequest {
  flight_id?: number;
  user_id?: number;
  aircraft_id?: number;
  dep_airport_id: string;
  arr_airport_id: string;
  route: string;
  route_code?: string;
  route_leg?: string;
  distance: number;
  flight_time: number; // in minutes
  block_time?: number; // in minutes
  fuel_used?: number; // in gallons or liters
  landing_rate?: number;
  score?: number;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  submitted_at?: string; // ISO datetime
  flight_date?: string; // YYYY-MM-DD
  notes?: string;
  // Additional fields that may be required
  [key: string]: unknown;
}

/**
 * phpVMS API PIREP response
 */
export interface PhpVmsPirep {
  id: number;
  user_id: number;
  flight_id: number | null;
  aircraft_id: number;
  dep_airport_id: string;
  arr_airport_id: string;
  route: string;
  distance: number;
  flight_time: number;
  block_time: number | null;
  fuel_used: number | null;
  landing_rate: number | null;
  score: number | null;
  status: string;
  submitted_at: string;
  flight_date: string;
  notes: string | null;
}

/**
 * phpVMS API error response
 */
export interface PhpVmsError {
  error: string;
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * phpVMS API standard response wrapper
 */
export interface PhpVmsApiResponse<T> {
  data: T;
  meta?: {
    count?: number;
    total?: number;
    page?: number;
    per_page?: number;
  };
}

/**
 * VA Configuration for phpVMS integration
 */
export interface VaConfig {
  id: number;
  name: string;
  baseUrl: string;
  apiToken: string;
  enabled: boolean;
}
