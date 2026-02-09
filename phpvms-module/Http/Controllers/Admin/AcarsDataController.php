<?php

namespace Modules\SkyNetAcars\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Modules\SkyNetAcars\Models\AcarsFlight;
use Modules\SkyNetAcars\Models\AcarsPosition;

class AcarsDataController extends Controller
{
    /**
     * Display ACARS data list
     *
     * @param Request $request
     * @return View
     */
    public function index(Request $request): View
    {
        $flights = AcarsFlight::with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return view('skynet-acars::admin.data.index', [
            'flights' => $flights
        ]);
    }

    /**
     * Display ACARS flight details
     *
     * @param int $id
     * @return View
     */
    public function show(int $id): View
    {
        $flight = AcarsFlight::with(['user', 'positions'])
            ->findOrFail($id);

        return view('skynet-acars::admin.data.show', [
            'flight' => $flight
        ]);
    }
}
