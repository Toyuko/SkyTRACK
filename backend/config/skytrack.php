<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Feeder Authentication Token
    |--------------------------------------------------------------------------
    |
    | Shared secret between the Python feeder client and this API.
    | The feeder sends this in the X-Feeder-Token header.
    |
    */
    'feeder_token' => env('SKYTRACK_FEEDER_TOKEN', 'change-me-in-production'),

    /*
    |--------------------------------------------------------------------------
    | Flight TTL (seconds)
    |--------------------------------------------------------------------------
    |
    | How long a flight stays "active" in Redis after its last telemetry
    | update. After this period, the flight is considered expired.
    |
    */
    'flight_ttl' => (int) env('SKYTRACK_FLIGHT_TTL', 300),

    /*
    |--------------------------------------------------------------------------
    | Reverb WebSocket Configuration
    |--------------------------------------------------------------------------
    */
    'reverb' => [
        'app_id'  => env('REVERB_APP_ID', 'skytrack'),
        'app_key' => env('REVERB_APP_KEY', 'skytrack-key'),
        'host'    => env('REVERB_HOST', '0.0.0.0'),
        'port'    => (int) env('REVERB_PORT', 8080),
    ],
];
