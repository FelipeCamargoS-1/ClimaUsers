import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { env } from './config/env';

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Weather & Users API', version: '1.0.0', description: 'API de gerenciamento de usuários e consulta meteorológica.' },
    servers: [{ url: `http://localhost:${env.PORT}/api`, description: 'Servidor local' }],
  },
  apis: ['./src/routes/*.ts'],
});

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

export { swaggerSpec };
