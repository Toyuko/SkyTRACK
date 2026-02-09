import { SocketStream } from '@fastify/websocket';
import { FastifyInstance } from 'fastify';
import { SkyNetAcarsData } from '../acars/skynet.schema';
import { skynetAcarsService } from '../acars/skynet.service';
import { flightService } from '../flights/flight.service';

/**
 * Channel name for flight tracking WebSocket
 */
export const FLIGHT_CHANNEL = 'skynet:flights';

/**
 * Set of all connected WebSocket clients
 */
const connectedClients = new Set<SocketStream>();

/**
 * Handle WebSocket connection for flight channel
 * @param connection WebSocket connection
 * @param fastify Fastify instance
 */
export function handleFlightChannel(connection: SocketStream, fastify: FastifyInstance): void {
  const clientId = `${connection.socket.remoteAddress}:${Date.now()}`;
  connectedClients.add(connection);

  fastify.log.info(`[SkyNet] WebSocket client connected: ${clientId} (total: ${connectedClients.size})`);

  // Handle incoming messages
  connection.socket.on('message', async (message: Buffer) => {
    try {
      const rawData = JSON.parse(message.toString());
      
      // Validate ACARS data
      const validationResult = skynetAcarsService.safeValidateAndNormalize(rawData);
      
      if (!validationResult.success || !validationResult.data) {
        fastify.log.warn(`[SkyNet] Invalid ACARS data from ${clientId}: ${validationResult.error}`);
        connection.socket.send(JSON.stringify({
          error: 'Invalid ACARS data',
          details: validationResult.error,
        }));
        return;
      }

      const acarsData: SkyNetAcarsData = validationResult.data;

      // Store position update in database
      try {
        await flightService.storePosition(acarsData);
      } catch (error) {
        fastify.log.error(`[SkyNet] Failed to store position update: ${error}`);
        // Continue to broadcast even if storage fails
      }

      // Broadcast normalized ACARS data to all connected clients
      broadcastToAllClients(acarsData, fastify);

      fastify.log.debug(`[SkyNet] Position update received and broadcast: ${acarsData.callsign}`);
    } catch (error) {
      fastify.log.error(`[SkyNet] Error processing WebSocket message from ${clientId}: ${error}`);
      connection.socket.send(JSON.stringify({
        error: 'Failed to process message',
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  });

  // Handle client disconnection
  connection.socket.on('close', () => {
    connectedClients.delete(connection);
    fastify.log.info(`[SkyNet] WebSocket client disconnected: ${clientId} (total: ${connectedClients.size})`);
  });

  // Handle errors
  connection.socket.on('error', (error) => {
    fastify.log.error(`[SkyNet] WebSocket error for ${clientId}: ${error}`);
    connectedClients.delete(connection);
  });

  // Send welcome message
  connection.socket.send(JSON.stringify({
    type: 'connected',
    channel: FLIGHT_CHANNEL,
    message: 'Connected to SkyNet flight tracking channel',
  }));
}

/**
 * Broadcast ACARS data to all connected clients
 * @param data SkyNet ACARS data to broadcast
 * @param fastify Fastify instance for logging
 */
function broadcastToAllClients(data: SkyNetAcarsData, fastify: FastifyInstance): void {
  const message = JSON.stringify({
    type: 'position_update',
    channel: FLIGHT_CHANNEL,
    data: data,
  });

  let successCount = 0;
  let errorCount = 0;

  connectedClients.forEach((client) => {
    try {
      if (client.socket.readyState === 1) { // WebSocket.OPEN
        client.socket.send(message);
        successCount++;
      } else {
        // Remove closed connections
        connectedClients.delete(client);
        errorCount++;
      }
    } catch (error) {
      fastify.log.error(`[SkyNet] Error broadcasting to client: ${error}`);
      connectedClients.delete(client);
      errorCount++;
    }
  });

  if (errorCount > 0) {
    fastify.log.debug(`[SkyNet] Broadcast completed: ${successCount} sent, ${errorCount} failed`);
  }
}

/**
 * Get number of connected clients
 */
export function getConnectedClientCount(): number {
  return connectedClients.size;
}

/**
 * Broadcast a message to all connected clients (for system messages)
 * @param message Message to broadcast
 * @param fastify Fastify instance
 */
export function broadcastSystemMessage(message: Record<string, unknown>, fastify: FastifyInstance): void {
  const jsonMessage = JSON.stringify({
    type: 'system',
    channel: FLIGHT_CHANNEL,
    ...message,
  });

  connectedClients.forEach((client) => {
    try {
      if (client.socket.readyState === 1) {
        client.socket.send(jsonMessage);
      } else {
        connectedClients.delete(client);
      }
    } catch (error) {
      fastify.log.error(`[SkyNet] Error broadcasting system message: ${error}`);
      connectedClients.delete(client);
    }
  });
}
