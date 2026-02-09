import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment variable schema for SkyNet backend
 */
const envSchema = z.object({
  SKYNET_PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(65535)),
  SKYNET_DB_URL: z.string().url('SKYNET_DB_URL must be a valid PostgreSQL connection URL'),
  SKYNET_REDIS_URL: z.string().url('SKYNET_REDIS_URL must be a valid Redis connection URL'),
  SKYNET_LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
});

/**
 * Validated and typed environment configuration
 */
export type SkyNetConfig = z.infer<typeof envSchema>;

let config: SkyNetConfig;

try {
  config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('[SkyNet] Environment variable validation failed:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export default config;
