<?php

namespace App\Http\Controllers;

use App\Events\FlightDataUpdated;
use App\Services\FlightStateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * TelemetryController
 *
 * Ingests real-time flight telemetry from the FSUIPC/XPUIPC feeder client,
 * stores the current state in Redis, and broadcasts to WebSocket subscribers.
 */
class TelemetryController extends Controller
{
    public function __construct(
        private readonly FlightStateService $flightState
    ) {}

    /**
     * POST /api/telemetry
     *
     * Ingest a telemetry snapshot from the feeder client.
     * Expects JSON with flight instrument data read from FSUIPC/XPUIPC offsets.
     */
    public function ingest(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'callsign'       => 'required|string|max:10',
            'aircraft_icao'  => 'required|string|max:4',
            'latitude'       => 'required|numeric|between:-90,90',
            'longitude'      => 'required|numeric|between:-180,180',
            'altitude'       => 'required|numeric',
            'heading'        => 'required|numeric|between:0,360',
            'ias'            => 'required|numeric|min:0',
            'ground_speed'   => 'required|numeric|min:0',
            'vertical_speed' => 'required|numeric',
            'fuel_kg'        => 'required|numeric|min:0',
            'on_ground'      => 'required|boolean',
            'sim_time'       => 'nullable|string',
            'simulator'      => 'required|string|in:MSFS,P3D,FSX,XPLANE',
            'departure_icao' => 'nullable|string|max:4',
            'arrival_icao'   => 'nullable|string|max:4',
            'flight_phase'   => 'nullable|string|max:20',
            'timestamp'      => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $data['server_timestamp'] = now()->toIso8601String();

        // Store in Redis (fast cache for current state)
        $this->flightState->updatePosition($data['callsign'], $data);

        // Broadcast to WebSocket subscribers (sub-second delivery)
        broadcast(new FlightDataUpdated($data))->toOthers();

        return response()->json([
            'status'    => 'ok',
            'callsign'  => $data['callsign'],
            'timestamp' => $data['server_timestamp'],
        ]);
    }

    /**
     * GET /api/telemetry/current
     *
     * Get current state of all active flights from Redis cache.
     */
    public function current(): JsonResponse
    {
        $flights = $this->flightState->getAllActiveFlights();

        return response()->json([
            'status'  => 'ok',
            'count'   => count($flights),
            'flights' => $flights,
        ]);
    }

    /**
     * GET /api/telemetry/{callsign}
     *
     * Get current state of a specific flight.
     */
    public function show(string $callsign): JsonResponse
    {
        $flight = $this->flightState->getPosition($callsign);

        if (!$flight) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Flight not found or expired',
            ], 404);
        }

        return response()->json([
            'status' => 'ok',
            'flight' => $flight,
        ]);
    }

    /**
     * DELETE /api/telemetry/{callsign}
     *
     * Remove a flight from tracking (e.g., flight completed).
     */
    public function destroy(string $callsign): JsonResponse
    {
        $this->flightState->removePosition($callsign);

        return response()->json([
            'status'   => 'ok',
            'callsign' => $callsign,
            'message'  => 'Flight removed from tracking',
        ]);
    }
}
