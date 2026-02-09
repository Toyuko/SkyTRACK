<?php

namespace Modules\SkyNetAcars\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcarsPosition extends Model
{
    protected $table = 'acars_positions';

    protected $fillable = [
        'acars_flight_id',
        'latitude',
        'longitude',
        'altitude',
        'ground_speed',
        'heading',
        'vertical_speed',
        'fuel_kg',
        'flight_phase',
        'on_ground',
        'acars_timestamp',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'altitude' => 'integer',
        'ground_speed' => 'integer',
        'heading' => 'integer',
        'vertical_speed' => 'integer',
        'fuel_kg' => 'decimal:2',
        'on_ground' => 'boolean',
        'acars_timestamp' => 'datetime',
    ];

    /**
     * Get the ACARS flight that owns this position
     */
    public function acarsFlight(): BelongsTo
    {
        return $this->belongsTo(AcarsFlight::class, 'acars_flight_id');
    }
}
