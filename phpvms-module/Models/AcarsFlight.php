<?php

namespace Modules\SkyNetAcars\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\User;
use App\Models\Flight;

class AcarsFlight extends Model
{
    protected $table = 'acars_flights';

    protected $fillable = [
        'user_id',
        'flight_id',
        'callsign',
        'simulator',
        'aircraft_icao',
        'departure_icao',
        'arrival_icao',
        'started_at',
        'ended_at',
        'status',
        'metadata',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'metadata' => 'array',
    ];

    /**
     * Get the user that owns this ACARS flight
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the phpVMS flight associated with this ACARS flight
     */
    public function flight(): BelongsTo
    {
        return $this->belongsTo(Flight::class);
    }

    /**
     * Get all position updates for this flight
     */
    public function positions(): HasMany
    {
        return $this->hasMany(AcarsPosition::class, 'acars_flight_id');
    }

    /**
     * Get the first position update
     */
    public function firstPosition(): ?AcarsPosition
    {
        return $this->positions()->orderBy('acars_timestamp', 'asc')->first();
    }

    /**
     * Get the last position update
     */
    public function lastPosition(): ?AcarsPosition
    {
        return $this->positions()->orderBy('acars_timestamp', 'desc')->first();
    }

    /**
     * Calculate total flight time in minutes
     */
    public function getFlightTimeAttribute(): int
    {
        if (!$this->started_at || !$this->ended_at) {
            $firstPosition = $this->firstPosition();
            $lastPosition = $this->lastPosition();
            
            if (!$firstPosition || !$lastPosition) {
                return 0;
            }
            
            $start = $firstPosition->acars_timestamp;
            $end = $lastPosition->acars_timestamp;
        } else {
            $start = $this->started_at;
            $end = $this->ended_at;
        }

        return (int) round($start->diffInMinutes($end));
    }

    /**
     * Calculate total distance flown in nautical miles
     */
    public function getDistanceAttribute(): float
    {
        $positions = $this->positions()->orderBy('acars_timestamp', 'asc')->get();
        
        if ($positions->count() < 2) {
            return 0;
        }

        $totalDistance = 0;
        for ($i = 1; $i < $positions->count(); $i++) {
            $prev = $positions[$i - 1];
            $curr = $positions[$i];
            $totalDistance += $this->haversineDistance(
                $prev->latitude,
                $prev->longitude,
                $curr->latitude,
                $curr->longitude
            );
        }

        return round($totalDistance, 2);
    }

    /**
     * Calculate great circle distance between two points (Haversine formula)
     */
    private function haversineDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $R = 3440; // Earth radius in nautical miles
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        
        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);
        
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        
        return $R * $c;
    }
}
