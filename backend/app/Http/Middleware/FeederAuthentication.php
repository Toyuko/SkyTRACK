<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * FeederAuthentication
 *
 * Authenticates the feeder client via a shared API key.
 * The feeder sends the key in the X-Feeder-Token header.
 */
class FeederAuthentication
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->header('X-Feeder-Token');

        if (!$token || $token !== config('skytrack.feeder_token')) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Invalid or missing feeder token',
            ], 401);
        }

        return $next($request);
    }
}
