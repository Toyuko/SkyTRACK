<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * FlightDataUpdated
 *
 * Broadcast event fired on every telemetry ingest.
 * Uses ShouldBroadcastNow to bypass the queue for sub-second delivery.
 * Laravel Reverb handles the WebSocket transport.
 */
class FlightDataUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly array $telemetry
    ) {}

    /**
     * Channel name the event broadcasts on.
     * Clients subscribe to 'flights' to receive all position updates.
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('flights'),
        ];
    }

    /**
     * Event name on the WebSocket channel.
     */
    public function broadcastAs(): string
    {
        return 'telemetry.updated';
    }

    /**
     * Data payload sent to WebSocket clients.
     */
    public function broadcastWith(): array
    {
        return $this->telemetry;
    }
}
