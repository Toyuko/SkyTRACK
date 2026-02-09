<?php

namespace Modules\SkyNetAcars\Services;

use Modules\SkyNetAcars\Models\AcarsFlight;
use App\Models\Pirep;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PirepService
{
    /**
     * Create PIREP from ACARS flight data
     *
     * @param AcarsFlight $flight
     * @return Pirep
     */
    public function createPirepFromAcarsFlight(AcarsFlight $flight): Pirep
    {
        $positions = $flight->positions()->orderBy('acars_timestamp', 'asc')->get();
        
        if ($positions->isEmpty()) {
            throw new \Exception('Cannot create PIREP: No position data available');
        }

        $firstPosition = $positions->first();
        $lastPosition = $positions->last();

        // Calculate flight metrics
        $flightTime = $flight->flight_time;
        $distance = $flight->distance;
        $blockTime = $this->calculateBlockTime($positions);

        // Calculate fuel used (if available)
        $fuelUsed = null;
        if ($firstPosition->fuel_kg !== null && $lastPosition->fuel_kg !== null) {
            $fuelUsed = max(0, $firstPosition->fuel_kg - $lastPosition->fuel_kg);
            // Convert kg to gallons (approximate conversion)
            $fuelUsed = round($fuelUsed * 0.33, 2);
        }

        // Calculate landing rate (from last position's vertical speed)
        $landingRate = null;
        if ($lastPosition->vertical_speed !== null && $lastPosition->on_ground) {
            $landingRate = abs($lastPosition->vertical_speed);
        }

        // Calculate score (simplified)
        $score = null;
        if (config('skynet-acars.pirep.calculate_score', true)) {
            $score = $this->calculateScore($flight, $positions);
        }

        // Determine status
        $status = config('skynet-acars.pirep.default_status', 'PENDING');
        if (config('skynet-acars.pirep.auto_approve', false)) {
            $status = 'APPROVED';
        }

        // Create PIREP
        $pirep = Pirep::create([
            'user_id' => $flight->user_id,
            'flight_id' => $flight->flight_id,
            'aircraft_id' => $this->getAircraftId($flight->aircraft_icao),
            'dep_airport_id' => $flight->departure_icao,
            'arr_airport_id' => $flight->arrival_icao,
            'route' => $flight->departure_icao . '-' . $flight->arrival_icao,
            'route_code' => $flight->callsign,
            'distance' => $distance,
            'flight_time' => $flightTime,
            'block_time' => $blockTime,
            'fuel_used' => $fuelUsed,
            'landing_rate' => $landingRate,
            'score' => $score,
            'status' => $status,
            'flight_date' => $flight->started_at->format('Y-m-d'),
            'submitted_at' => now(),
            'notes' => 'Submitted via SkyNet ACARS',
        ]);

        Log::info('[SkyNet ACARS] PIREP created', [
            'pirep_id' => $pirep->id,
            'user_id' => $flight->user_id,
            'flight_id' => $flight->id,
        ]);

        return $pirep;
    }

    /**
     * Calculate block time (from engine start to engine stop)
     *
     * @param \Illuminate\Database\Eloquent\Collection $positions
     * @return int Minutes
     */
    private function calculateBlockTime($positions): int
    {
        if ($positions->count() < 2) {
            return 0;
        }

        // Find first position where aircraft is moving
        $firstMoving = $positions->firstWhere(function ($position) {
            return $position->ground_speed > 0 && !$position->on_ground;
        });

        // Find last position before landing
        $lastActive = $positions->reverse()->firstWhere(function ($position) {
            return $position->on_ground && $position->ground_speed < 10;
        });

        if (!$firstMoving || !$lastActive) {
            // Fallback to flight time
            $start = $positions->first()->acars_timestamp;
            $end = $positions->last()->acars_timestamp;
            return (int) round($start->diffInMinutes($end));
        }

        return (int) round($firstMoving->acars_timestamp->diffInMinutes($lastActive->acars_timestamp));
    }

    /**
     * Calculate flight score
     *
     * @param AcarsFlight $flight
     * @param \Illuminate\Database\Eloquent\Collection $positions
     * @return int Score (0-100)
     */
    private function calculateScore(AcarsFlight $flight, $positions): int
    {
        $score = 100;

        // Deduct points for hard landing
        $lastPosition = $positions->last();
        if ($lastPosition->vertical_speed !== null && abs($lastPosition->vertical_speed) > 600) {
            $score -= 20; // Hard landing penalty
        }

        // Deduct points for overspeed
        $maxSpeed = $positions->max('ground_speed');
        if ($maxSpeed > 350) { // Assuming commercial aircraft max speed
            $score -= 10;
        }

        // Deduct points for altitude violations (simplified)
        $maxAltitude = $positions->max('altitude');
        if ($maxAltitude > 45000) { // Very high altitude
            $score -= 5;
        }

        return max(0, min(100, $score));
    }

    /**
     * Get aircraft ID from ICAO code
     *
     * @param string $icao
     * @return int|null
     */
    private function getAircraftId(string $icao): ?int
    {
        // Try to find aircraft by ICAO code
        $aircraft = DB::table('aircraft')
            ->where('icao', $icao)
            ->first();

        return $aircraft ? $aircraft->id : null;
    }
}
