import { PhpVmsUser, PhpVmsFlight, PhpVmsBid, PhpVmsPirep, PhpVmsPirepRequest, PhpVmsError, PhpVmsApiResponse, VaConfig } from './phpvms.types';

/**
 * phpVMS 7 API Client
 * Handles HTTP communication with phpVMS 7 API endpoints
 */
export class PhpVmsClient {
  private baseUrl: string;
  private apiToken: string;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(config: VaConfig, maxRetries: number = 3, retryDelayMs: number = 1000) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiToken = config.apiToken;
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
  }

  /**
   * Make HTTP request with retry logic and exponential backoff
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
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
          const errorData = await response.json().catch(() => ({})) as PhpVmsError;
          throw new Error(
            `[SkyNet] phpVMS API error (${response.status}): ${errorData.error || errorData.message || response.statusText}`
          );
        }

        const data = await response.json() as T;
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && 'status' in error) {
          const status = (error as { status?: number }).status;
          if (status && status >= 400 && status < 500) {
            throw error;
          }
        }

        if (attempt < this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, attempt); // Exponential backoff
          console.warn(
            `[SkyNet] phpVMS API request failed (attempt ${attempt + 1}/${this.maxRetries + 1}), retrying in ${delay}ms:`,
            lastError.message
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('[SkyNet] phpVMS API request failed after retries');
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get user/pilot information
   * @param userId User ID or 'me' for current authenticated user
   * @returns User data
   */
  async getUser(userId: string | number = 'me'): Promise<PhpVmsUser> {
    const response = await this.request<PhpVmsApiResponse<PhpVmsUser>>(`/api/user/${userId}`);
    return response.data;
  }

  /**
   * Validate pilot exists and is active
   * @param userId User ID or 'me' for current authenticated user
   * @returns True if pilot is valid
   */
  async validatePilot(userId: string | number = 'me'): Promise<boolean> {
    try {
      await this.getUser(userId);
      return true;
    } catch (error) {
      console.error('[SkyNet] Pilot validation failed:', error);
      return false;
    }
  }

  /**
   * Get flight information
   * @param flightId Flight ID
   * @returns Flight data
   */
  async getFlight(flightId: number): Promise<PhpVmsFlight> {
    const response = await this.request<PhpVmsApiResponse<PhpVmsFlight>>(`/api/flights/${flightId}`);
    return response.data;
  }

  /**
   * Validate flight exists and is available
   * @param flightId Flight ID
   * @returns True if flight is valid
   */
  async validateFlight(flightId: number): Promise<boolean> {
    try {
      await this.getFlight(flightId);
      return true;
    } catch (error) {
      console.error('[SkyNet] Flight validation failed:', error);
      return false;
    }
  }

  /**
   * Get active bid for user
   * @param userId User ID or 'me' for current authenticated user
   * @returns Active bid or null
   */
  async getActiveBid(userId: string | number = 'me'): Promise<PhpVmsBid | null> {
    try {
      const response = await this.request<PhpVmsApiResponse<PhpVmsBid[]>>(`/api/user/${userId}/bids`);
      const bids = response.data;
      // Return the first active bid (phpVMS typically returns active bids first)
      return bids.length > 0 ? bids[0] : null;
    } catch (error) {
      console.error('[SkyNet] Failed to get active bid:', error);
      return null;
    }
  }

  /**
   * Validate bid exists for user
   * @param userId User ID
   * @param flightId Flight ID
   * @returns True if bid exists
   */
  async validateBid(userId: string | number, flightId: number): Promise<boolean> {
    try {
      const bid = await this.getActiveBid(userId);
      return bid !== null && bid.flight_id === flightId;
    } catch (error) {
      console.error('[SkyNet] Bid validation failed:', error);
      return false;
    }
  }

  /**
   * Submit PIREP
   * @param pirepData PIREP data to submit
   * @returns Submitted PIREP
   */
  async submitPirep(pirepData: PhpVmsPirepRequest): Promise<PhpVmsPirep> {
    const response = await this.request<PhpVmsApiResponse<PhpVmsPirep>>('/api/pireps', {
      method: 'POST',
      body: JSON.stringify(pirepData),
    });
    return response.data;
  }

  /**
   * Search flights
   * @param params Search parameters (departure, arrival, aircraft, etc.)
   * @returns Array of matching flights
   */
  async searchFlights(params: {
    dep_airport_id?: string;
    arr_airport_id?: string;
    aircraft_id?: number;
    flight_number?: string;
    page?: number;
    per_page?: number;
  } = {}): Promise<PhpVmsFlight[]> {
    const queryParams = new URLSearchParams();
    if (params.dep_airport_id) queryParams.append('dep_airport_id', params.dep_airport_id);
    if (params.arr_airport_id) queryParams.append('arr_airport_id', params.arr_airport_id);
    if (params.aircraft_id) queryParams.append('aircraft_id', params.aircraft_id.toString());
    if (params.flight_number) queryParams.append('flight_number', params.flight_number);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());

    const endpoint = `/api/flights${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.request<PhpVmsApiResponse<PhpVmsFlight[]>>(endpoint);
    return Array.isArray(response.data) ? response.data : [response.data];
  }

  /**
   * Create a bid (book a flight)
   * @param flightId Flight ID to bid on
   * @param userId User ID or 'me' for current authenticated user
   * @returns Created bid
   */
  async createBid(flightId: number, userId: string | number = 'me'): Promise<PhpVmsBid> {
    const response = await this.request<PhpVmsApiResponse<PhpVmsBid>>(`/api/user/${userId}/bids`, {
      method: 'POST',
      body: JSON.stringify({ flight_id: flightId }),
    });
    return response.data;
  }

  /**
   * Delete a bid (cancel booking)
   * @param bidId Bid ID to delete
   * @param userId User ID or 'me' for current authenticated user
   */
  async deleteBid(bidId: number, userId: string | number = 'me'): Promise<void> {
    await this.request(`/api/user/${userId}/bids/${bidId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get all bids for a user
   * @param userId User ID or 'me' for current authenticated user
   * @returns Array of bids
   */
  async getBids(userId: string | number = 'me'): Promise<PhpVmsBid[]> {
    const response = await this.request<PhpVmsApiResponse<PhpVmsBid[]>>(`/api/user/${userId}/bids`);
    return Array.isArray(response.data) ? response.data : [response.data];
  }
}
