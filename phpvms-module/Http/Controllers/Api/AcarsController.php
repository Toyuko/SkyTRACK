<?php

namespace Modules\SkyNetAcars\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Modules\SkyNetAcars\Models\AcarsPosition;
use Modules\SkyNetAcars\Models\AcarsFlight;
use Modules\SkyNetAcars\Services\AcarsService;
use Modules\SkyNetAcars\Services\PirepService;
use App\Models\Flight;
use App\Models\Bid;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class AcarsController extends Controller
{
    protected $acarsService;
    protected $pirepService;

    public function __construct(AcarsService $acarsService, PirepService $pirepService)
    {
        $this->acarsService = $acarsService;
        $this->pirepService = $pirepService;
    }

    /**
     * Submit ACARS position update
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function submitPosition(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'callsign' => 'required|string|max:10',
            'simulator' => 'required|string|in:MSFS,FSX,P3D,XPLANE',
            'aircraftIcao' => 'required|string|size:4',
            'departureIcao' => 'required|string|size:4',
            'arrivalIcao' => 'required|string|size:4',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'altitude' => 'required|numeric|between:-1000,100000',
            'groundSpeed' => 'required|numeric|min:0|max:2000',
            'heading' => 'required|numeric|between:0,360',
            'fuelKg' => 'required|numeric|min:0',
            'flightPhase' => 'required|string',
            'timestamp' => 'required|date',
            'verticalSpeed' => 'nullable|numeric',
            'onGround' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = $request->user();
            $data = $validator->validated();

            // Get or create active flight for this user
            $flight = $this->acarsService->getOrCreateActiveFlight($user->id, $data);

            // Store position update
            $position = $this->acarsService->storePosition($flight->id, $data);

            // Broadcast to connected clients (if using WebSocket)
            // event(new AcarsPositionUpdated($position));

            return response()->json([
                'success' => true,
                'data' => [
                    'flight_id' => $flight->id,
                    'position_id' => $position->id,
                    'timestamp' => $position->created_at->toIso8601String(),
                ]
            ], 201);

        } catch (\Exception $e) {
            Log::error('[SkyNet ACARS] Position submission failed', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to submit position',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle flight start event
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function flightStart(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'flight_id' => 'nullable|integer|exists:flights,id',
            'callsign' => 'required|string|max:10',
            'departureIcao' => 'required|string|size:4',
            'arrivalIcao' => 'required|string|size:4',
            'aircraftIcao' => 'required|string|size:4',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = $request->user();
            $data = $validator->validated();

            // Validate flight/bid if flight_id provided
            if (isset($data['flight_id'])) {
                if (config('skynet-acars.acars.require_bid', false)) {
                    $hasBid = Bid::where('user_id', $user->id)
                        ->where('flight_id', $data['flight_id'])
                        ->exists();

                    if (!$hasBid) {
                        return response()->json([
                            'error' => 'No active bid found for this flight'
                        ], 403);
                    }
                }
            }

            $flight = $this->acarsService->startFlight($user->id, $data);

            return response()->json([
                'success' => true,
                'data' => [
                    'flight_id' => $flight->id,
                    'acars_flight_id' => $flight->id,
                ]
            ], 201);

        } catch (\Exception $e) {
            Log::error('[SkyNet ACARS] Flight start failed', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'error' => 'Failed to start flight',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle flight end event and submit PIREP
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function flightEnd(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $flightId = $request->input('acars_flight_id');

            if (!$flightId) {
                return response()->json([
                    'error' => 'acars_flight_id is required'
                ], 422);
            }

            $flight = AcarsFlight::where('id', $flightId)
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->first();

            if (!$flight) {
                return response()->json([
                    'error' => 'Active flight not found'
                ], 404);
            }

            // End the flight
            $flight = $this->acarsService->endFlight($flight->id);

            // Auto-submit PIREP if enabled
            if (config('skynet-acars.acars.auto_submit_pirep', true)) {
                $pirep = $this->pirepService->createPirepFromAcarsFlight($flight);

                return response()->json([
                    'success' => true,
                    'data' => [
                        'flight_id' => $flight->id,
                        'pirep_id' => $pirep->id,
                        'pirep_status' => $pirep->status,
                    ]
                ], 200);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'flight_id' => $flight->id,
                    'message' => 'Flight ended. PIREP submission disabled.',
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('[SkyNet ACARS] Flight end failed', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'error' => 'Failed to end flight',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate flight exists and is available
     *
     * @param int $flightId
     * @return JsonResponse
     */
    public function validateFlight(int $flightId): JsonResponse
    {
        try {
            $flight = Flight::find($flightId);

            if (!$flight) {
                return response()->json([
                    'valid' => false,
                    'error' => 'Flight not found'
                ], 404);
            }

            return response()->json([
                'valid' => true,
                'data' => [
                    'flight_id' => $flight->id,
                    'flight_number' => $flight->flight_number,
                    'dep_airport_id' => $flight->dep_airport_id,
                    'arr_airport_id' => $flight->arr_airport_id,
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'valid' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate user has active bid for flight
     *
     * @param Request $request
     * @param int $flightId
     * @return JsonResponse
     */
    public function validateBid(Request $request, int $flightId): JsonResponse
    {
        try {
            $user = $request->user();
            $bid = Bid::where('user_id', $user->id)
                ->where('flight_id', $flightId)
                ->first();

            if (!$bid) {
                return response()->json([
                    'valid' => false,
                    'error' => 'No active bid found for this flight'
                ], 404);
            }

            return response()->json([
                'valid' => true,
                'data' => [
                    'bid_id' => $bid->id,
                    'flight_id' => $bid->flight_id,
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'valid' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
