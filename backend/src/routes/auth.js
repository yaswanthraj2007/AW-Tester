import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, refreshLimiter } from '../middleware/rateLimiters.js';
import { signupSchema, loginSchema, changePasswordSchema } from '../validators/authSchemas.js';
import {
  getCsrf,
  signup,
  login,
  refresh,
  logout,
  me,
  changePassword,
} from '../controllers/authController.js';

const router = Router();

router.get('/csrf', getCsrf);
router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, authLimiter, validate(changePasswordSchema), changePassword);

export default router;