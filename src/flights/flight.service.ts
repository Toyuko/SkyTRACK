import { Pool, PoolClient } from 'pg';
import config from '../config/env';
import { SkyNetAcarsData } from '../acars/skynet.schema';
import { FlightPosition, FlightPositionRow, rowToFlightPosition, acarsDataToInsertParams } from './flight.model';

/**
 * Flight Service
 * Handles database operations for flight position updates and flight history
 */
export class FlightService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.SKYNET_DB_URL,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('[SkyNet] Unexpected database pool error:', err);
    });
  }

  /**
   * Initialize database schema (create tables if they don't exist)
   * TODO: Consider using a proper migration system in production
   */
  async initializeSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS flight_positions (
          id SERIAL PRIMARY KEY,
          callsign VARCHAR(10) NOT NULL,
          simulator VARCHAR(10) NOT NULL,
          aircraft_icao VARCHAR(4) NOT NULL,
          departure_icao VARCHAR(4) NOT NULL,
          arrival_icao VARCHAR(4) NOT NULL,
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          altitude DOUBLE PRECISION NOT NULL,
          ground_speed DOUBLE PRECISION NOT NULL,
          heading DOUBLE PRECISION NOT NULL,
          fuel_kg DOUBLE PRECISION NOT NULL,
          flight_phase VARCHAR(20) NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_flight_positions_callsign ON flight_positions(callsign);
        CREATE INDEX IF NOT EXISTS idx_flight_positions_timestamp ON flight_positions(timestamp);
        CREATE INDEX IF NOT EXISTS idx_flight_positions_callsign_timestamp ON flight_positions(callsign, timestamp);
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS vas (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          base_url VARCHAR(255) NOT NULL,
          api_token VARCHAR(255) NOT NULL,
          enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      console.log('[SkyNet] Database schema initialized');
    } catch (error) {
      console.error('[SkyNet] Failed to initialize database schema:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Store a flight position update
   * @param data SkyNet ACARS data to store
   * @returns Stored flight position record
   */
  async storePosition(data: SkyNetAcarsData): Promise<FlightPosition> {
    const params = acarsDataToInsertParams(data);
    const client = await this.pool.connect();
    try {
      const result = await client.query<FlightPositionRow>(
        `
        INSERT INTO flight_positions (
          callsign, simulator, aircraft_icao, departure_icao, arrival_icao,
          latitude, longitude, altitude, ground_speed, heading,
          fuel_kg, flight_phase, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
        `,
        [
          params.callsign,
          params.simulator,
          params.aircraft_icao,
          params.departure_icao,
          params.arrival_icao,
          params.latitude,
          params.longitude,
          params.altitude,
          params.ground_speed,
          params.heading,
          params.fuel_kg,
          params.flight_phase,
          params.timestamp,
        ]
      );

      if (result.rows.length === 0) {
        throw new Error('[SkyNet] Failed to insert flight position');
      }

      return rowToFlightPosition(result.rows[0]);
    } catch (error) {
      console.error('[SkyNet] Error storing flight position:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get latest position for a callsign
   * @param callsign Aircraft callsign
   * @returns Latest flight position or null
   */
  async getLatestPosition(callsign: string): Promise<FlightPosition | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<FlightPositionRow>(
        `
        SELECT * FROM flight_positions
        WHERE callsign = $1
        ORDER BY timestamp DESC
        LIMIT 1
        `,
        [callsign]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return rowToFlightPosition(result.rows[0]);
    } catch (error) {
      console.error('[SkyNet] Error getting latest position:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get flight positions for a callsign within a time range
   * @param callsign Aircraft callsign
   * @param startTime Start time (optional)
   * @param endTime End time (optional)
   * @returns Array of flight positions
   */
  async getFlightPositions(
    callsign: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<FlightPosition[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT * FROM flight_positions
        WHERE callsign = $1
      `;
      const params: (string | Date)[] = [callsign];

      if (startTime) {
        query += ` AND timestamp >= $${params.length + 1}`;
        params.push(startTime);
      }

      if (endTime) {
        query += ` AND timestamp <= $${params.length + 1}`;
        params.push(endTime);
      }

      query += ` ORDER BY timestamp ASC`;

      const result = await client.query<FlightPositionRow>(query, params);
      return result.rows.map(rowToFlightPosition);
    } catch (error) {
      console.error('[SkyNet] Error getting flight positions:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all active flights (flights with recent position updates)
   * @param maxAgeMinutes Maximum age of last update in minutes (default: 15)
   * @returns Array of latest positions for active flights
   */
  async getActiveFlights(maxAgeMinutes: number = 15): Promise<FlightPosition[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<FlightPositionRow>(
        `
        SELECT DISTINCT ON (callsign) *
        FROM flight_positions
        WHERE timestamp > NOW() - INTERVAL '${maxAgeMinutes} minutes'
        ORDER BY callsign, timestamp DESC
        `,
        []
      );

      return result.rows.map(rowToFlightPosition);
    } catch (error) {
      console.error('[SkyNet] Error getting active flights:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export singleton instance
export const flightService = new FlightService();
