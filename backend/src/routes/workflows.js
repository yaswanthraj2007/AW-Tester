import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { runLimiter } from '../middleware/rateLimiters.js';
import { workflowSchema, idParamSchema } from '../validators/workflowSchemas.js';
import {
  listWorkflows,
  createWorkflow,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from '../controllers/workflowController.js';
import { startWorkflowRun } from '../controllers/runController.js';

const router = Router();

router.use(authenticate);

router.get('/', listWorkflows);
router.post('/', validate(workflowSchema), createWorkflow);
router.get('/:id', validate(idParamSchema, 'params'), getWorkflow);
router.put('/:id', validate(idParamSchema, 'params'), validate(workflowSchema), updateWorkflow);
router.delete('/:id', validate(idParamSchema, 'params'), deleteWorkflow);
router.post('/:id/run', validate(idParamSchema, 'params'), runLimiter, startWorkflowRun);

export default router;