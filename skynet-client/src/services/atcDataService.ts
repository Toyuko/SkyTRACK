/**
 * ATC data service for fetching Air Traffic Control stations from IVAO and VATSIM
 */

export interface ATCStation {
  callsign: string;
  frequency: string; // MHz as string (e.g., "121.500")
  latitude: number;
  longitude: number;
  facility: string; // Facility type (e.g., "CTR", "APP", "TWR", "GND", "DEL")
  rating?: string; // Controller rating
  name?: string; // Controller name
  visualRange?: number; // Visual range in NM
  textAtis?: string; // ATIS text
  source: 'vatsim' | 'ivao';
  lastUpdated?: string; // ISO timestamp
  logonTime?: string; // ISO timestamp
}

export interface ATCDataService {
  fetchVATSIMATC(): Promise<ATCStation[]>;
  fetchIVAOATC(): Promise<ATCStation[]>;
}

class ATCDataServiceImpl implements ATCDataService {
  private vatsimUrl = 'https://data.vatsim.net/v3/vatsim-data.json';
  private ivaoUrl = 'https://api.ivao.aero/v2/tracker/whazzup';

  /**
   * Fetch VATSIM ATC stations
   */
  async fetchVATSIMATC(): Promise<ATCStation[]> {
    try {
      const response = await fetch(this.vatsimUrl);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();

      const controllers: ATCStation[] = [];
      
      // VATSIM v3 API has controllers array
      if (data.controllers && Array.isArray(data.controllers)) {
        for (const controller of data.controllers) {
          // Only include controllers with position data
          if (controller.latitude != null && controller.longitude != null) {
            controllers.push({
              callsign: controller.callsign || '',
              frequency: this.formatFrequency(controller.frequency),
              latitude: parseFloat(controller.latitude) || 0,
              longitude: parseFloat(controller.longitude) || 0,
              facility: this.mapVATSIMFacility(controller.facility),
              rating: controller.rating?.toString(),
              name: controller.name,
              visualRange: controller.visual_range ? parseFloat(controller.visual_range) : undefined,
              textAtis: controller.text_atis,
              source: 'vatsim',
              lastUpdated: controller.last_updated,
              logonTime: controller.logon_time,
            });
          }
        }
      }

      // Also check ATIS stations
      if (data.atis && Array.isArray(data.atis)) {
        for (const atis of data.atis) {
          if (atis.latitude != null && atis.longitude != null) {
            controllers.push({
              callsign: atis.callsign || '',
              frequency: this.formatFrequency(atis.frequency),
              latitude: parseFloat(atis.latitude) || 0,
              longitude: parseFloat(atis.longitude) || 0,
              facility: this.mapVATSIMFacility(atis.facility),
              rating: atis.rating?.toString(),
              name: atis.name,
              visualRange: atis.visual_range ? parseFloat(atis.visual_range) : undefined,
              textAtis: atis.text_atis,
              source: 'vatsim',
              lastUpdated: atis.last_updated,
              logonTime: atis.logon_time,
            });
          }
        }
      }

      return controllers;
    } catch (error) {
      console.error('[ATCData] Failed to fetch VATSIM ATC:', error);
      return [];
    }
  }

  /**
   * Fetch IVAO ATC stations
   */
  async fetchIVAOATC(): Promise<ATCStation[]> {
    try {
      const response = await fetch(this.ivaoUrl);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();

      if (!data.clients || !Array.isArray(data.clients.atcs)) {
        return [];
      }

      return data.clients.atcs
        .filter((atc: any) => atc.lastTrack?.latitude != null && atc.lastTrack?.longitude != null)
        .map((atc: any) => {
          const track = atc.lastTrack || {};
          return {
            callsign: atc.callsign || '',
            frequency: this.formatFrequency(atc.frequency || track.frequency),
            latitude: parseFloat(track.latitude) || 0,
            longitude: parseFloat(track.longitude) || 0,
            facility: this.mapIVAOFacility(atc.facilityType || atc.facility),
            rating: atc.rating?.toString(),
            name: atc.name,
            visualRange: atc.visualRange ? parseFloat(atc.visualRange) : undefined,
            textAtis: atc.atis?.text,
            source: 'ivao',
            lastUpdated: track.timestamp,
            logonTime: atc.connectionTime,
          };
        });
    } catch (error) {
      console.error('[ATCData] Failed to fetch IVAO ATC:', error);
      return [];
    }
  }

  /**
   * Format frequency to standard MHz format (e.g., "121.500")
   */
  private formatFrequency(freq: string | number | undefined): string {
    if (!freq) return '0.000';
    const num = typeof freq === 'string' ? parseFloat(freq) : freq;
    if (isNaN(num)) return '0.000';
    // Ensure 3 decimal places
    return num.toFixed(3);
  }

  /**
   * Map VATSIM facility ID to facility name
   */
  private mapVATSIMFacility(facilityId: number | string | undefined): string {
    const id = typeof facilityId === 'string' ? parseInt(facilityId, 10) : facilityId;
    const facilityMap: Record<number, string> = {
      0: 'OBS', // Observer
      1: 'FSS', // Flight Service Station
      2: 'DEL', // Clearance Delivery
      3: 'GND', // Ground
      4: 'TWR', // Tower
      5: 'APP', // Approach
      6: 'CTR', // Center
    };
    return facilityMap[id || 0] || 'UNK';
  }

  /**
   * Map IVAO facility type to facility name
   */
  private mapIVAOFacility(facilityType: string | undefined): string {
    if (!facilityType) return 'UNK';
    const upper = facilityType.toUpperCase();
    // IVAO uses similar facility types
    if (upper.includes('DELIVERY') || upper.includes('DEL')) return 'DEL';
    if (upper.includes('GROUND') || upper.includes('GND')) return 'GND';
    if (upper.includes('TOWER') || upper.includes('TWR')) return 'TWR';
    if (upper.includes('APPROACH') || upper.includes('APP')) return 'APP';
    if (upper.includes('CENTER') || upper.includes('CTR')) return 'CTR';
    if (upper.includes('FSS') || upper.includes('FLIGHT SERVICE')) return 'FSS';
    if (upper.includes('OBSERVER') || upper.includes('OBS')) return 'OBS';
    return upper.substring(0, 3);
  }
}

export const atcDataService = new ATCDataServiceImpl();
