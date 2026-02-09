<?php

namespace Modules\SkyNetAcars\Services;

use Modules\SkyNetAcars\Models\AcarsFlight;
use Modules\SkyNetAcars\Models\AcarsPosition;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AcarsService
{
    /**
     * Get or create active flight for user
     *
     * @param int $userId
     * @param array $data
     * @return AcarsFlight
     */
    public function getOrCreateActiveFlight(int $userId, array $data): AcarsFlight
    {
        // Check for existing active flight
        $flight = AcarsFlight::where('user_id', $userId)
            ->where('status', 'active')
            ->first();

        if (!$flight) {
            // Create new flight
            $flight = $this->startFlight($userId, $data);
        }

        return $flight;
    }

    /**
     * Start a new ACARS flight
     *
     * @param int $userId
     * @param array $data
     * @return AcarsFlight
     */
    public function startFlight(int $userId, array $data): AcarsFlight
    {
        return AcarsFlight::create([
            'user_id' => $userId,
            'flight_id' => $data['flight_id'] ?? null,
            'callsign' => strtoupper($data['callsign']),
            'simulator' => $data['simulator'],
            'aircraft_icao' => strtoupper($data['aircraftIcao']),
            'departure_icao' => strtoupper($data['departureIcao']),
            'arrival_icao' => strtoupper($data['arrivalIcao']),
            'started_at' => now(),
            'status' => 'active',
            'metadata' => $data,
        ]);
    }

    /**
     * Store position update
     *
     * @param int $flightId
     * @param array $data
     * @return AcarsPosition
     */
    public function storePosition(int $flightId, array $data): AcarsPosition
    {
        return AcarsPosition::create([
            'acars_flight_id' => $flightId,
            'latitude' => $data['latitude'],
            'longitude' => $data['longitude'],
            'altitude' => (int) $data['altitude'],
            'ground_speed' => (int) $data['groundSpeed'],
            'heading' => (int) $data['heading'],
            'vertical_speed' => isset($data['verticalSpeed']) ? (int) $data['verticalSpeed'] : null,
            'fuel_kg' => $data['fuelKg'] ?? null,
            'flight_phase' => $data['flightPhase'],
            'on_ground' => $data['onGround'] ?? ($data['altitude'] < 100 && $data['groundSpeed'] < 10),
            'acars_timestamp' => $data['timestamp'],
        ]);
    }

    /**
     * End an ACARS flight
     *
     * @param int $flightId
     * @return AcarsFlight
     */
    public function endFlight(int $flightId): AcarsFlight
    {
        $flight = AcarsFlight::findOrFail($flightId);
        
        $flight->update([
            'ended_at' => now(),
            'status' => 'completed',
        ]);

        return $flight->fresh();
    }

    /**
     * Cancel an ACARS flight
     *
     * @param int $flightId
     * @return AcarsFlight
     */
    public function cancelFlight(int $flightId): AcarsFlight
    {
        $flight = AcarsFlight::findOrFail($flightId);
        
        $flight->update([
            'ended_at' => now(),
            'status' => 'cancelled',
        ]);

        return $flight->fresh();
    }
}
