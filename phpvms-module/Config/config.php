<?php

return [
    'name' => 'SkyNetAcars',
    'enabled' => env('SKYNET_ACARS_ENABLED', true),
    
    // ACARS Configuration
    'acars' => [
        'auto_submit_pirep' => env('SKYNET_ACARS_AUTO_SUBMIT_PIREP', true),
        'require_bid' => env('SKYNET_ACARS_REQUIRE_BID', false),
        'min_flight_time' => env('SKYNET_ACARS_MIN_FLIGHT_TIME', 5), // minutes
        'position_update_interval' => env('SKYNET_ACARS_POSITION_UPDATE_INTERVAL', 30), // seconds
    ],
    
    // API Configuration
    'api' => [
        'rate_limit' => env('SKYNET_ACARS_RATE_LIMIT', 60), // requests per minute
        'require_authentication' => env('SKYNET_ACARS_REQUIRE_AUTH', true),
    ],
    
    // PIREP Configuration
    'pirep' => [
        'auto_approve' => env('SKYNET_ACARS_AUTO_APPROVE_PIREP', false),
        'default_status' => env('SKYNET_ACARS_DEFAULT_PIREP_STATUS', 'PENDING'),
        'calculate_score' => env('SKYNET_ACARS_CALCULATE_SCORE', true),
    ],
];
