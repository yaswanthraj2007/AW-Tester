import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { runLimiter } from '../middleware/rateLimiters.js';
import { quickTestSchema } from '../validators/runSchemas.js';
import { startQuickTest } from '../controllers/runController.js';

const router = Router();

router.use(authenticate);
router.post('/', runLimiter, validate(quickTestSchema), startQuickTest);

export default router;