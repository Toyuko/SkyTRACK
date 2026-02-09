/**
 * Traffic data service for fetching flight data from various sources
 */

export interface FlightTraffic {
  callsign: string;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  groundSpeed: number;
  departureIcao?: string;
  arrivalIcao?: string;
  aircraftIcao?: string;
  source: 'va' | 'vatsim' | 'ivao' | 'poscon' | 'smartcars';
}

export interface TrafficDataService {
  fetchVATraffic(): Promise<FlightTraffic[]>;
  fetchVATSIMTraffic(): Promise<FlightTraffic[]>;
  fetchIVAOTraffic(): Promise<FlightTraffic[]>;
  fetchPOSCONTraffic(): Promise<FlightTraffic[]>;
  fetchSmartCARSTraffic(): Promise<FlightTraffic[]>;
}

class TrafficDataServiceImpl implements TrafficDataService {
  private vatsimUrl = 'https://data.vatsim.net/v3/vatsim-data.json';
  private ivaoUrl = 'https://api.ivao.aero/v2/tracker/whazzup';
  
  /**
   * Fetch Virtual Airline traffic from backend
   */
  async fetchVATraffic(): Promise<FlightTraffic[]> {
    try {
      // This would fetch from your backend API that aggregates VA traffic
      // For now, return empty array - you'll need to implement the backend endpoint
      const response = await fetch('/api/traffic/va');
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return this.normalizeTrafficData(data, 'va');
    } catch (error) {
      console.error('[TrafficData] Failed to fetch VA traffic:', error);
      return [];
    }
  }

  /**
   * Fetch VATSIM traffic
   */
  async fetchVATSIMTraffic(): Promise<FlightTraffic[]> {
    try {
      const response = await fetch(this.vatsimUrl);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      
      if (!data.pilots || !Array.isArray(data.pilots)) {
        return [];
      }

      return data.pilots
        .filter((pilot: any) => pilot.latitude && pilot.longitude)
        .map((pilot: any) => ({
          callsign: pilot.callsign || '',
          latitude: parseFloat(pilot.latitude) || 0,
          longitude: parseFloat(pilot.longitude) || 0,
          altitude: parseFloat(pilot.altitude) || 0,
          heading: parseFloat(pilot.heading) || 0,
          groundSpeed: parseFloat(pilot.groundspeed) || 0,
          departureIcao: pilot.flight_plan?.departure || undefined,
          arrivalIcao: pilot.flight_plan?.arrival || undefined,
          aircraftIcao: pilot.flight_plan?.aircraft_short || undefined,
          source: 'vatsim' as const,
        }));
    } catch (error) {
      console.error('[TrafficData] Failed to fetch VATSIM traffic:', error);
      return [];
    }
  }

  /**
   * Fetch IVAO traffic
   * IVAO v2 API: position data is in lastTrack, not on pilot directly
   */
  async fetchIVAOTraffic(): Promise<FlightTraffic[]> {
    try {
      const response = await fetch(this.ivaoUrl);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      
      if (!data.clients || !Array.isArray(data.clients.pilots)) {
        return [];
      }

      return data.clients.pilots
        .filter((pilot: any) => pilot.lastTrack?.latitude != null && pilot.lastTrack?.longitude != null)
        .map((pilot: any) => {
          const track = pilot.lastTrack || {};
          return {
            callsign: pilot.callsign || '',
            latitude: parseFloat(track.latitude) || 0,
            longitude: parseFloat(track.longitude) || 0,
            altitude: parseFloat(track.altitude) || 0,
            heading: parseFloat(track.heading) || 0,
            groundSpeed: parseFloat(track.groundSpeed) || 0,
            departureIcao: pilot.flightPlan?.departureId || undefined,
            arrivalIcao: pilot.flightPlan?.arrivalId || undefined,
            aircraftIcao: pilot.flightPlan?.aircraftId || undefined,
            source: 'ivao' as const,
          };
        });
    } catch (error) {
      console.error('[TrafficData] Failed to fetch IVAO traffic:', error);
      return [];
    }
  }

  /**
   * Fetch POSCON traffic
   */
  async fetchPOSCONTraffic(): Promise<FlightTraffic[]> {
    try {
      // POSCON API endpoint (if available)
      const response = await fetch('https://api.poscon.net/v1/traffic');
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return this.normalizeTrafficData(data, 'poscon');
    } catch (error) {
      console.error('[TrafficData] Failed to fetch POSCON traffic:', error);
      return [];
    }
  }

  /**
   * Fetch smartCARS traffic from backend
   */
  async fetchSmartCARSTraffic(): Promise<FlightTraffic[]> {
    try {
      // This would fetch from your backend API that aggregates smartCARS traffic
      const response = await fetch('/api/traffic/smartcars');
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return this.normalizeTrafficData(data, 'smartcars');
    } catch (error) {
      console.error('[TrafficData] Failed to fetch smartCARS traffic:', error);
      return [];
    }
  }

  /**
   * Normalize traffic data from various sources
   */
  private normalizeTrafficData(data: any, source: FlightTraffic['source']): FlightTraffic[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter((item: any) => item.latitude && item.longitude)
      .map((item: any) => ({
        callsign: item.callsign || '',
        latitude: parseFloat(item.latitude) || 0,
        longitude: parseFloat(item.longitude) || 0,
        altitude: parseFloat(item.altitude) || 0,
        heading: parseFloat(item.heading) || 0,
        groundSpeed: parseFloat(item.groundSpeed) || 0,
        departureIcao: item.departureIcao || item.departure_icao || undefined,
        arrivalIcao: item.arrivalIcao || item.arrival_icao || undefined,
        aircraftIcao: item.aircraftIcao || item.aircraft_icao || undefined,
        source,
      }));
  }
}

export const trafficDataService = new TrafficDataServiceImpl();
