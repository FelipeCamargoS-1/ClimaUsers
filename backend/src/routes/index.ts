import { Router } from 'express';
import { prisma } from '../config/database';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import weatherRoutes from './weather.routes';
import { requireAuth, requireCsrf } from '../middlewares/auth.middleware';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, message: 'Aplicação está saudável', data: { status: 'UP', database: 'connected', uptime: process.uptime() }, timestamp: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    res.status(500).json({ success: false, message: 'Aplicação com problemas de saúde', data: { status: 'DOWN', database: 'disconnected', error: message }, timestamp: new Date().toISOString() });
  }
});

router.use('/auth', authRoutes);
router.use('/users', requireAuth, requireCsrf, userRoutes);
router.use('/weather', requireAuth, weatherRoutes);

export default router;
