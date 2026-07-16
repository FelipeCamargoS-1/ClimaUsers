import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validation.middleware';
import { authLoginSchema, authRegisterSchema } from '../schemas/auth.schema';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireCsrf } from '../middlewares/auth.middleware';

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post('/register', authRateLimiter, validate(authRegisterSchema, 'body'), authController.register);
router.post('/login', authRateLimiter, validate(authLoginSchema, 'body'), authController.login);
router.post('/logout', requireAuth, requireCsrf, authController.logout);
router.get('/me', authController.me);

export default router;
