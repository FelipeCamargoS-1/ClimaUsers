import { Router } from 'express';
import { weatherController } from '../controllers/weather.controller';

const router = Router();

router.get('/:city', weatherController.getByCity);

export default router;
