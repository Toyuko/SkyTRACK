<?php

use App\Http\Controllers\TelemetryController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| SkyTRACK API Routes
|--------------------------------------------------------------------------
|
| POST   /api/telemetry            — Ingest telemetry from feeder client
| GET    /api/telemetry/current    — Get all active flights (Redis cache)
| GET    /api/telemetry/{callsign} — Get specific flight state
| DELETE /api/telemetry/{callsign} — Remove flight from tracking
|
*/

Route::prefix('telemetry')->group(function () {
    Route::post('/', [TelemetryController::class, 'ingest']);
    Route::get('/current', [TelemetryController::class, 'current']);
    Route::get('/{callsign}', [TelemetryController::class, 'show']);
    Route::delete('/{callsign}', [TelemetryController::class, 'destroy']);
});

// Health check
Route::get('/health', fn () => response()->json([
    'status'  => 'ok',
    'service' => 'SkyTRACK API',
    'version' => '2.0.0',
    'time'    => now()->toIso8601String(),
]));
