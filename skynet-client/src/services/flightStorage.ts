import { CurrentFlight, BookedFlight, FreeFlight } from '../types/flight';

const STORAGE_KEY = 'skynet_current_flight';

export const flightStorage = {
  /**
   * Get current flight
   */
  getCurrentFlight(): CurrentFlight {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[FlightStorage] Failed to load current flight:', error);
    }
    return null;
  },

  /**
   * Save current flight
   */
  saveCurrentFlight(flight: CurrentFlight): void {
    try {
      if (flight) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(flight));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('[FlightStorage] Failed to save current flight:', error);
    }
  },

  /**
   * Clear current flight
   */
  clearCurrentFlight(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[FlightStorage] Failed to clear current flight:', error);
    }
  },
};
