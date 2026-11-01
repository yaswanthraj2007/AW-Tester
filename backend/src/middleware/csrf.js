import crypto from 'crypto';
import { config } from '../config/index.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const safeEqual = (a, b) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

const deny = (res) =>
  res.status(403).json({ message: 'Invalid or missing CSRF token', code: 'CSRF_INVALID' });

export const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  // Browsers always send Origin on POST/PUT/PATCH/DELETE
  const origin = req.get('Origin');
  if (origin && origin !== config.frontendOrigin) return deny(res);
  if (!origin && config.isProd) return deny(res);

  const cookieToken = req.cookies?.csrf_token;
  const headerToken = req.get('X-CSRF-Token');

  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') return deny(res);
  if (!cookieToken || !safeEqual(cookieToken, headerToken)) return deny(res);

  next();
};