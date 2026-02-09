<?php

namespace Modules\SkyNetAcars\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Config;

class SettingsController extends Controller
{
    /**
     * Display module dashboard
     *
     * @return View
     */
    public function index(): View
    {
        return view('skynet-acars::admin.index');
    }

    /**
     * Display settings page
     *
     * @return View
     */
    public function settings(): View
    {
        $config = config('skynet-acars');
        
        return view('skynet-acars::admin.settings', [
            'config' => $config
        ]);
    }

    /**
     * Save settings
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function saveSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'enabled' => 'boolean',
            'acars.auto_submit_pirep' => 'boolean',
            'acars.require_bid' => 'boolean',
            'acars.min_flight_time' => 'integer|min:0',
            'acars.position_update_interval' => 'integer|min:1',
            'api.rate_limit' => 'integer|min:1',
            'api.require_authentication' => 'boolean',
            'pirep.auto_approve' => 'boolean',
            'pirep.default_status' => 'string|in:PENDING,APPROVED,REJECTED',
            'pirep.calculate_score' => 'boolean',
        ]);

        // Update config file or database
        // This is a simplified version - in production, you'd want to store in database
        foreach ($validated as $key => $value) {
            Config::set("skynet-acars.{$key}", $value);
        }

        return redirect()->route('admin.skynet-acars.settings')
            ->with('success', 'Settings saved successfully');
    }
}
