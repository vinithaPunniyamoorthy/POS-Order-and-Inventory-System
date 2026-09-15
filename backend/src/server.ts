import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/prisma';
import { ReservationExpiryService } from './services/reservationExpiryService';
import { ensureDatabaseConstraints } from './config/databaseConstraints';

const expiryService = new ReservationExpiryService(prisma);

async function start() {
  await ensureDatabaseConstraints(prisma);
  app.listen(env.port, () => logger.info(`POS API running on http://localhost:${env.port}`));
  const expiryTimer = setInterval(() => {
    expiryService.expireReservations().catch((error: unknown) => logger.error('Reservation expiry failed', error));
  }, 30_000);
  expiryTimer.unref();
}

start().catch((error: unknown) => {
  logger.error('Unable to start POS API', error);
  process.exitCode = 1;
});
