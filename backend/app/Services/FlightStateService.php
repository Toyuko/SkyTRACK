<?php

namespace App\Services;

use Illuminate\Support\Facades\Redis;

/**
 * FlightStateService
 *
 * Manages real-time flight state in Redis for sub-second access.
 * Each flight's current telemetry is stored as a hash with a TTL.
 * This avoids database writes on every position update (10Hz from feeder).
 */
class FlightStateService
{
    private const KEY_PREFIX = 'skytrack:flight:';
    private const INDEX_KEY  = 'skytrack:active_flights';

    /** TTL in seconds — flights expire after 5 minutes of no updates */
    private const FLIGHT_TTL = 300;

    /**
     * Store or update a flight's current position in Redis.
     */
    public function updatePosition(string $callsign, array $data): void
    {
        $key = self::KEY_PREFIX . strtoupper($callsign);

        // Store the full telemetry snapshot as a JSON string
        Redis::setex($key, self::FLIGHT_TTL, json_encode($data));

        // Add to the active flights sorted set (score = timestamp for ordering)
        Redis::zadd(self::INDEX_KEY, [strtoupper($callsign) => time()]);
    }

    /**
     * Get a flight's current position from Redis.
     */
    public function getPosition(string $callsign): ?array
    {
        $key  = self::KEY_PREFIX . strtoupper($callsign);
        $data = Redis::get($key);

        if (!$data) {
            // Clean up the index if the key has expired
            Redis::zrem(self::INDEX_KEY, strtoupper($callsign));
            return null;
        }

        return json_decode($data, true);
    }

    /**
     * Get all currently active flights from Redis.
     * Prunes expired entries from the index.
     */
    public function getAllActiveFlights(): array
    {
        // Get all callsigns from the sorted set
        $callsigns = Redis::zrangebyscore(
            self::INDEX_KEY,
            time() - self::FLIGHT_TTL,
            '+inf'
        );

        $flights = [];
        $expired = [];

        foreach ($callsigns as $callsign) {
            $data = $this->getPosition($callsign);
            if ($data) {
                $flights[] = $data;
            } else {
                $expired[] = $callsign;
            }
        }

        // Prune expired entries
        if (!empty($expired)) {
            Redis::zrem(self::INDEX_KEY, ...$expired);
        }

        return $flights;
    }

    /**
     * Remove a flight from tracking.
     */
    public function removePosition(string $callsign): void
    {
        $key = self::KEY_PREFIX . strtoupper($callsign);
        Redis::del($key);
        Redis::zrem(self::INDEX_KEY, strtoupper($callsign));
    }

    /**
     * Get the count of active flights.
     */
    public function getActiveCount(): int
    {
        return (int) Redis::zcount(
            self::INDEX_KEY,
            time() - self::FLIGHT_TTL,
            '+inf'
        );
    }
}
