/**
 * Arranque del broker como proceso independiente.
 *
 * Falla ruidosamente y temprano: si la configuración no valida —driver `env` en producción, token
 * de servicio ausente, IdP mal declarado—, el proceso termina con código distinto de cero en vez
 * de quedarse escuchando en un estado que solo se descubriría en la primera credencial pedida.
 */
import { config as loadDotenv } from 'dotenv';
import type { Server } from 'node:http';
import { composeAuthBroker } from '../auth-broker.composition';
import { createAuthBrokerServer } from '../infrastructure/http/auth-broker.http-server';

/** Cada cuánto se purgan las autorizaciones OIDC caducadas. */
const MAINTENANCE_INTERVAL_MS = 60_000;

function closeServer(server: Server, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const forced = setTimeout(resolve, timeoutMs);
    server.close(() => {
      clearTimeout(forced);
      resolve();
    });
  });
}

function main(): void {
  loadDotenv();

  const broker = composeAuthBroker();
  const { logger } = broker.services;
  const server = createAuthBrokerServer(broker.services);

  const maintenance = setInterval(() => {
    void broker.runMaintenance().catch((error: unknown) => {
      logger.error('auth_broker_maintenance_failed', {
        errorName: error instanceof Error ? error.name : typeof error,
      });
    });
  }, MAINTENANCE_INTERVAL_MS);
  // El mantenimiento no debe impedir que el proceso termine cuando ya no hay nada más que hacer.
  maintenance.unref();

  // La siembra del vault debe completarse ANTES de aceptar tráfico: servir peticiones con el
  // vault a medio poblar devolvería `CREDENTIAL_NOT_FOUND` para credenciales que sí existen.
  void broker
    .initialize()
    .then(() => {
      server.listen(broker.config.port, () => {
        logger.info('auth_broker_started', {
          port: broker.config.port,
          vaultDriver: broker.services.vault.driver,
        });
      });
    })
    .catch((error: unknown) => {
      logger.error('auth_broker_initialization_failed', {
        errorName: error instanceof Error ? error.name : typeof error,
      });
      process.exit(1);
    });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('auth_broker_shutting_down', { signal });
    clearInterval(maintenance);
    void closeServer(server, broker.config.shutdownTimeoutSeconds * 1_000).then(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Un rechazo sin capturar en un proceso que custodia credenciales deja el estado en duda: se
  // registra y se termina, en vez de seguir sirviendo tokens desde un proceso indeterminado.
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('auth_broker_unhandled_rejection', {
      errorName: reason instanceof Error ? reason.name : typeof reason,
    });
    shutdown('unhandledRejection');
  });
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `${JSON.stringify({
      level: 'error',
      service: 'atlas-auth-broker-worker',
      event: 'auth_broker_boot_failed',
      message: error instanceof Error ? error.message : 'Error desconocido al arrancar.',
    })}\n`,
  );
  process.exit(1);
}
