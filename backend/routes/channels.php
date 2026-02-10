<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| The 'flights' channel is public — any connected WebSocket client
| can subscribe to receive real-time telemetry updates.
|
*/

Broadcast::channel('flights', function () {
    return true;
});
