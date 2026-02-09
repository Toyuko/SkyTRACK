<?php

use Illuminate\Support\Facades\Route;
use Modules\SkyNetAcars\Http\Controllers\Api\AcarsController;
use Modules\SkyNetAcars\Http\Controllers\Api\PirepController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your module. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group.
|
*/

Route::prefix('skynet-acars')->group(function () {
    // ACARS data submission endpoints
    Route::post('/position', [AcarsController::class, 'submitPosition'])
        ->middleware(['auth:sanctum', 'throttle:' . config('skynet-acars.api.rate_limit', 60) . ',1']);
    
    Route::post('/flight-start', [AcarsController::class, 'flightStart'])
        ->middleware(['auth:sanctum']);
    
    Route::post('/flight-end', [AcarsController::class, 'flightEnd'])
        ->middleware(['auth:sanctum']);
    
    // PIREP endpoints
    Route::post('/pirep/submit', [PirepController::class, 'submitPirep'])
        ->middleware(['auth:sanctum']);
    
    Route::get('/pirep/{id}', [PirepController::class, 'getPirep'])
        ->middleware(['auth:sanctum']);
    
    // Flight validation endpoints
    Route::get('/validate/flight/{flightId}', [AcarsController::class, 'validateFlight'])
        ->middleware(['auth:sanctum']);
    
    Route::get('/validate/bid/{flightId}', [AcarsController::class, 'validateBid'])
        ->middleware(['auth:sanctum']);
});
