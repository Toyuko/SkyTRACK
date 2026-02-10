import { MongoClient, Db, Collection } from 'mongodb';
import config from '../config/env';
import { SkyNetAcarsData } from '../acars/skynet.schema';
import { FlightPosition, FlightPositionDoc, docToFlightPosition, acarsDataToDoc } from './flight.model';

/**
 * Flight Service
 * Handles database operations for flight position updates and flight history
 * Uses MongoDB as the backing store
 */
export class FlightService {
  private client: MongoClient;
  private db!: Db;
  private positions!: Collection<FlightPositionDoc>;
  private connected: boolean = false;

  constructor() {
    this.client = new MongoClient(config.SKYNET_DB_URL, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 2000,
    });

    this.client.on('error', (err: Error) => {
      console.error('[SkyNet] Unexpected MongoDB client error:', err);
    });
  }

  /**
   * Connect to MongoDB and ensure indexes exist
   * TODO: Consider using a proper migration system in production
   */
  async initializeSchema(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
      this.db = this.client.db();
      this.positions = this.db.collection<FlightPositionDoc>('flight_positions');

      // Create indexes for efficient querying
      await this.positions.createIndex({ callsign: 1 });
      await this.positions.createIndex({ timestamp: 1 });
      await this.positions.createIndex({ callsign: 1, timestamp: -1 });

      // VAs collection
      const vas = this.db.collection('vas');
      await vas.createIndex({ name: 1 }, { unique: true });

      console.log('[SkyNet] MongoDB schema initialized');
    } catch (error) {
      console.error('[SkyNet] Failed to initialize MongoDB schema:', error);
      throw error;
    }
  }

  /**
   * Store a flight position update
   * @param data SkyNet ACARS data to store
   * @returns Stored flight position record
   */
  async storePosition(data: SkyNetAcarsData): Promise<FlightPosition> {
    const doc = acarsDataToDoc(data);
    try {
      const result = await this.positions.insertOne(doc);

      if (!result.acknowledged) {
        throw new Error('[SkyNet] Failed to insert flight position');
      }

      return docToFlightPosition({ _id: result.insertedId, ...doc });
    } catch (error) {
      console.error('[SkyNet] Error storing flight position:', error);
      throw error;
    }
  }

  /**
   * Get latest position for a callsign
   * @param callsign Aircraft callsign
   * @returns Latest flight position or null
   */
  async getLatestPosition(callsign: string): Promise<FlightPosition | null> {
    try {
      const doc = await this.positions.findOne(
        { callsign },
        { sort: { timestamp: -1 } }
      );

      if (!doc) {
        return null;
      }

      return docToFlightPosition(doc);
    } catch (error) {
      console.error('[SkyNet] Error getting latest position:', error);
      throw error;
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
    try {
      const filter: Record<string, unknown> = { callsign };

      if (startTime || endTime) {
        filter.timestamp = {};
        if (startTime) (filter.timestamp as Record<string, Date>).$gte = startTime;
        if (endTime) (filter.timestamp as Record<string, Date>).$lte = endTime;
      }

      const docs = await this.positions
        .find(filter)
        .sort({ timestamp: 1 })
        .toArray();

      return docs.map(docToFlightPosition);
    } catch (error) {
      console.error('[SkyNet] Error getting flight positions:', error);
      throw error;
    }
  }

  /**
   * Get all active flights (flights with recent position updates)
   * @param maxAgeMinutes Maximum age of last update in minutes (default: 15)
   * @returns Array of latest positions for active flights
   */
  async getActiveFlights(maxAgeMinutes: number = 15): Promise<FlightPosition[]> {
    try {
      const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

      // MongoDB aggregation to get the latest position per callsign
      const pipeline = [
        { $match: { timestamp: { $gt: cutoff } } },
        { $sort: { timestamp: -1 as const } },
        {
          $group: {
            _id: '$callsign',
            doc: { $first: '$$ROOT' },
          },
        },
        { $replaceRoot: { newRoot: '$doc' } },
      ];

      const docs = await this.positions.aggregate(pipeline).toArray();
      return docs.map((doc: any) => docToFlightPosition(doc));
    } catch (error) {
      console.error('[SkyNet] Error getting active flights:', error);
      throw error;
    }
  }

  /**
   * Close MongoDB connection
   */
  async close(): Promise<void> {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
  }
}

// Export singleton instance
export const flightService = new FlightService();
