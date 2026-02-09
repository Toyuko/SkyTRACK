import Fastify, { FastifyInstance } from 'fastify';
import config from './config/env';
import { registerWebSocketServer } from './websocket/wsServer';
import { flightService } from './flights/flight.service';

/**
 * Create and configure Fastify server instance
 */
export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: config.SKYNET_LOG_LEVEL,
      // TODO: Add pino-pretty transport for development if desired
      // transport: process.env.NODE_ENV === 'development' ? {
      //   target: 'pino-pretty',
      //   options: {
      //     translateTime: 'HH:MM:ss Z',
      //     ignore: 'pid,hostname',
      //   },
      // } : undefined,
    },
  });

  // Register WebSocket server
  await registerWebSocketServer(server);

  // Health check endpoint
  server.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      service: 'SkyNet ACARS Backend',
      timestamp: new Date().toISOString(),
    };
  });

  // API info endpoint
  server.get('/api/info', async (request, reply) => {
    return {
      service: 'SkyNet ACARS Backend',
      version: '1.0.0',
      websocket: {
        channel: 'skynet:flights',
        endpoint: `/ws/skynet:flights`,
      },
    };
  });

  // TODO: Add REST API endpoints for:
  // - GET /api/flights/active - Get active flights
  // - GET /api/flights/:callsign - Get flight history
  // - POST /api/pirep/submit - Submit PIREP manually

  // Error handler
  server.setErrorHandler((error, request, reply) => {
    server.log.error(`[SkyNet] Error: ${error.message}`);
    reply.status(error.statusCode || 500).send({
      error: 'Internal Server Error',
      message: error.message,
    });
  });

  // Graceful shutdown handler
  const gracefulShutdown = async (signal: string) => {
    server.log.info(`[SkyNet] ${signal} received, starting graceful shutdown...`);

    // Close WebSocket connections
    server.log.info('[SkyNet] Closing WebSocket connections...');
    // TODO: Implement WebSocket connection cleanup

    // Close database connections
    server.log.info('[SkyNet] Closing database connections...');
    try {
      await flightService.close();
      server.log.info('[SkyNet] Database connections closed');
    } catch (error) {
      server.log.error(`[SkyNet] Error closing database connections: ${error}`);
    }

    // Close Fastify server
    try {
      await server.close();
      server.log.info('[SkyNet] Server closed');
      process.exit(0);
    } catch (error) {
      server.log.error(`[SkyNet] Error during server shutdown: ${error}`);
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return server;
}

/**
 * Start the SkyNet server
 */
export async function startServer(): Promise<void> {
  try {
    // Initialize database schema
    await flightService.initializeSchema();

    // Create server
    const server = await createServer();

    // Start server
    await server.listen({
      port: config.SKYNET_PORT,
      host: '0.0.0.0', // Listen on all interfaces
    });

    server.log.info(`[SkyNet] Server listening on port ${config.SKYNET_PORT}`);
    server.log.info(`[SkyNet] WebSocket endpoint: ws://localhost:${config.SKYNET_PORT}/ws/skynet:flights`);
  } catch (error) {
    console.error('[SkyNet] Failed to start server:', error);
    process.exit(1);
  }
}
