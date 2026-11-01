import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index.js';

export const ACCESS_TTL_MS = 15 * 60 * 1000;
export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const signAccessToken = (user) =>
  jwt.sign({ sub: user.id }, config.jwtAccessSecret, {
    algorithm: 'HS256',
    expiresIn: '15m',
  });

// Role is deliberately NOT put in the token. The middleware loads the
// user from the store on every request, so role changes and disabled
// accounts take effect immediately.

export const verifyAccessToken = (token) =>
  jwt.verify(token, config.jwtAccessSecret, { algorithms: ['HS256'] });

export const generateRefreshToken = () => crypto.randomBytes(48).toString('hex');

export const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

// Shared cookie settings
const base = {
  secure: config.isProd,
  sameSite: 'strict',
};

export const accessCookieOptions = { ...base, httpOnly: true, maxAge: ACCESS_TTL_MS, path: '/' };

// Refresh cookie is only sent to the auth routes
export const refreshCookieOptions = { ...base, httpOnly: true, maxAge: REFRESH_TTL_MS, path: '/api/auth' };

// CSRF cookie must be readable by JS (double-submit), so httpOnly is false
export const csrfCookieOptions = { ...base, httpOnly: true, maxAge: REFRESH_TTL_MS, path: '/' };