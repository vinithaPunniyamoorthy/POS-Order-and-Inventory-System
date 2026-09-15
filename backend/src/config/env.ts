import dotenv from 'dotenv';

dotenv.config();

const parseAllowedOrigins = (raw?: string) => {
  if (!raw) return ['http://localhost:5173'];
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'development-secret')) {
  throw new Error('JWT_SECRET must be configured in production');
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pos_inventory?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'development-secret',
  corsOrigin: parseAllowedOrigins(process.env.CORS_ORIGIN),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 120),
};
