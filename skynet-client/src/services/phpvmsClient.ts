import { PhpVmsFlight, PhpVmsBid, FlightSearchParams, PhpVmsConfig } from '../types/flight';

/**
 * phpVMS API Client for frontend
 * Handles flight search and booking
 */
export class PhpVmsClient {
  private baseUrl: string;
  private apiToken: string;

  constructor(config: PhpVmsConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiToken = config.apiToken;
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `phpVMS API error (${response.status}): ${errorData.error || errorData.message || response.statusText}`
      );
    }

    const data = await response.json();
    // Handle phpVMS API response format
    if (data.data !== undefined) {
      return Array.isArray(data.data) ? data.data : [data.data];
    }
    return Array.isArray(data) ? data : [data];
  }

  /**
   * Search flights
   */
  async searchFlights(params: FlightSearchParams = {}): Promise<PhpVmsFlight[]> {
    const queryParams = new URLSearchParams();
    if (params.dep_airport_id) queryParams.append('dep_airport_id', params.dep_airport_id);
    if (params.arr_airport_id) queryParams.append('arr_airport_id', params.arr_airport_id);
    if (params.aircraft_id) queryParams.append('aircraft_id', params.aircraft_id.toString());
    if (params.flight_number) queryParams.append('flight_number', params.flight_number);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());

    const endpoint = `/api/flights${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.request<{ data: PhpVmsFlight[] }>(endpoint);
    return Array.isArray(response) ? response : [response];
  }

  /**
   * Get flight by ID
   */
  async getFlight(flightId: number): Promise<PhpVmsFlight> {
    const response = await this.request<{ data: PhpVmsFlight }>(`/api/flights/${flightId}`);
    return Array.isArray(response) ? response[0] : response;
  }

  /**
   * Create a bid (book a flight)
   */
  async createBid(flightId: number, userId: string | number = 'me'): Promise<PhpVmsBid> {
    const response = await this.request<{ data: PhpVmsBid }>(`/api/user/${userId}/bids`, {
      method: 'POST',
      body: JSON.stringify({ flight_id: flightId }),
    });
    return Array.isArray(response) ? response[0] : response;
  }

  /**
   * Delete a bid (cancel booking)
   */
  async deleteBid(bidId: number, userId: string | number = 'me'): Promise<void> {
    await this.request(`/api/user/${userId}/bids/${bidId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get active bid for user
   */
  async getActiveBid(userId: string | number = 'me'): Promise<PhpVmsBid | null> {
    try {
      const response = await this.request<{ data: PhpVmsBid[] }>(`/api/user/${userId}/bids`);
      const bids = Array.isArray(response) ? response : [response];
      return bids.length > 0 ? bids[0] : null;
    } catch (error) {
      console.error('[phpVMS] Failed to get active bid:', error);
      return null;
    }
  }
}
