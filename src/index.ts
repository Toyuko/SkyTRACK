import { startServer } from './server';

/**
 * SkyNet ACARS Backend Entry Point
 * 
 * This is the main entry point for the SkyNet ACARS backend service.
 * It initializes the server and handles process-level error handling.
 */

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[SkyNet] Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[SkyNet] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  console.error('[SkyNet] Fatal error starting server:', error);
  process.exit(1);
});
