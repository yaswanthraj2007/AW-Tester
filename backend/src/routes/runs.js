import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  runIdParamSchema,
  screenshotParamSchema,
  listRunsQuerySchema,
} from '../validators/runSchemas.js';
import { listRuns, getStats, getRun, getScreenshot } from '../controllers/runController.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(listRunsQuerySchema, 'query'), listRuns);
router.get('/stats', getStats); // must stay above '/:id'
router.get('/:id', validate(runIdParamSchema, 'params'), getRun);
router.get('/:id/screenshots/:shotId', validate(screenshotParamSchema, 'params'), getScreenshot);

export default router;