<?php

namespace Modules\SkyNetAcars\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Modules\SkyNetAcars\Models\AcarsFlight;
use Modules\SkyNetAcars\Services\PirepService;
use App\Models\Pirep;
use Illuminate\Support\Facades\Log;

class PirepController extends Controller
{
    protected $pirepService;

    public function __construct(PirepService $pirepService)
    {
        $this->pirepService = $pirepService;
    }

    /**
     * Submit PIREP from ACARS flight data
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function submitPirep(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $acarsFlightId = $request->input('acars_flight_id');

            if (!$acarsFlightId) {
                return response()->json([
                    'error' => 'acars_flight_id is required'
                ], 422);
            }

            $flight = AcarsFlight::where('id', $acarsFlightId)
                ->where('user_id', $user->id)
                ->first();

            if (!$flight) {
                return response()->json([
                    'error' => 'ACARS flight not found'
                ], 404);
            }

            $pirep = $this->pirepService->createPirepFromAcarsFlight($flight);

            return response()->json([
                'success' => true,
                'data' => [
                    'pirep_id' => $pirep->id,
                    'status' => $pirep->status,
                    'flight_time' => $pirep->flight_time,
                    'distance' => $pirep->distance,
                ]
            ], 201);

        } catch (\Exception $e) {
            Log::error('[SkyNet ACARS] PIREP submission failed', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'error' => 'Failed to submit PIREP',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get PIREP details
     *
     * @param int $id
     * @return JsonResponse
     */
    public function getPirep(int $id): JsonResponse
    {
        try {
            $pirep = Pirep::find($id);

            if (!$pirep) {
                return response()->json([
                    'error' => 'PIREP not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $pirep->id,
                    'user_id' => $pirep->user_id,
                    'flight_id' => $pirep->flight_id,
                    'status' => $pirep->status,
                    'flight_time' => $pirep->flight_time,
                    'distance' => $pirep->distance,
                    'fuel_used' => $pirep->fuel_used,
                    'landing_rate' => $pirep->landing_rate,
                    'score' => $pirep->score,
                    'submitted_at' => $pirep->submitted_at,
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to retrieve PIREP',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
