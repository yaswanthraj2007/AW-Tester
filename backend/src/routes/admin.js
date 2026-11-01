import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/workflowSchemas.js';
import {
  updateUserSchema,
  listUsersQuerySchema,
  adminRunsQuerySchema,
} from '../validators/adminSchemas.js';
import {
  getAdminStats,
  listUsers,
  updateUser,
  deleteUser,
  listAllRuns,
} from '../controllers/adminController.js';

const router = Router();

// Defense in depth: also enforced where this router is mounted in app.js
router.use(authenticate, authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', validate(listUsersQuerySchema, 'query'), listUsers);
router.patch('/users/:id', validate(idParamSchema, 'params'), validate(updateUserSchema), updateUser);
router.delete('/users/:id', validate(idParamSchema, 'params'), deleteUser);
router.get('/runs', validate(adminRunsQuerySchema, 'query'), listAllRuns);

export default router;