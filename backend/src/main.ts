import { Server } from 'http';
import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { logger } from './utils/logger';

export function bootstrap(): Server {
  const server = app.listen(env.PORT, () => {
    logger.info(`Servidor rodando em http://localhost:${env.PORT}`);
    logger.info(`Swagger disponível em http://localhost:${env.PORT}/api-docs`);
  });

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} recebido; encerrando a aplicação.`);
    server.close(async (error) => {
      try {
        await prisma.$disconnect();
      } finally {
        if (error) logger.error(error);
        process.exit(error ? 1 : 0);
      }
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return server;
}

if (require.main === module) {
  try {
    bootstrap();
  } catch (error) {
    logger.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  }
}
