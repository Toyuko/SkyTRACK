import { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import { handleFlightChannel, FLIGHT_CHANNEL } from './flightChannel';

/**
 * Register WebSocket server with Fastify
 * @param fastify Fastify instance
 */
export async function registerWebSocketServer(fastify: FastifyInstance): Promise<void> {
  // Register @fastify/websocket plugin
  await fastify.register(websocket, {
    options: {
      // WebSocket options
      maxPayload: 1024 * 1024, // 1MB max payload
    },
  });

  // Register flight channel WebSocket endpoint
  fastify.get(`/ws/${FLIGHT_CHANNEL}`, { websocket: true }, (connection, req) => {
    handleFlightChannel(connection, fastify);
  });

  fastify.log.info(`[SkyNet] WebSocket server registered at /ws/${FLIGHT_CHANNEL}`);
}
