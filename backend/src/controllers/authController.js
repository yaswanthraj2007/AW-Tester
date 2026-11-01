import { v4 as uuid } from 'uuid';
import { userStore, toPublic } from '../store/userStore.js';
import { refreshTokenStore } from '../store/refreshTokenStore.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, verifyPassword, verifyAgainstDummy } from '../utils/password.js';
import {
  signAccessToken,
  generateRefreshToken,
  generateCsrfToken,
  hashToken,
  REFRESH_TTL_MS,
  accessCookieOptions,
  refreshCookieOptions,
  csrfCookieOptions,
} from '../utils/tokens.js';
import { seedSampleWorkflows } from '../services/sampleWorkflows.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const CSRF_FORMAT = /^[a-f0-9]{64}$/;

// One message for every login failure (unknown email, wrong password, locked)
const INVALID_LOGIN =
  'Invalid email or password. If you have failed several times, wait 15 minutes before trying again.';

const withoutMaxAge = ({ maxAge, ...rest }) => rest;

const clearSessionCookies = (res) => {
  res.clearCookie('access_token', withoutMaxAge(accessCookieOptions));
  res.clearCookie('refresh_token', withoutMaxAge(refreshCookieOptions));
};

// Creates a refresh token record, sets the auth cookies, returns the CSRF token
const startSession = (req, res, user, { family = uuid(), rotateCsrf = false } = {}) => {
  const refreshToken = generateRefreshToken();

  refreshTokenStore.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: Date.now() + REFRESH_TTL_MS,
  });

  res.cookie('access_token', signAccessToken(user), accessCookieOptions);
  res.cookie('refresh_token', refreshToken, refreshCookieOptions);

  const existing = req.cookies?.csrf_token;
  const csrfToken =
    !rotateCsrf && typeof existing === 'string' && CSRF_FORMAT.test(existing)
      ? existing
      : generateCsrfToken();
  res.cookie('csrf_token', csrfToken, csrfCookieOptions);

  return csrfToken;
};

const registerFailedLogin = (userId) => {
  const user = userStore.findById(userId);
  if (!user) return;
  const attempts = user.failedLoginAttempts + 1;
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    userStore.update(userId, { failedLoginAttempts: 0, lockUntil: Date.now() + LOCK_MS });
  } else {
    userStore.update(userId, { failedLoginAttempts: attempts });
  }
};

// GET /api/auth/csrf
export const getCsrf = (req, res) => {
  const existing = req.cookies?.csrf_token;
  const csrfToken =
    typeof existing === 'string' && CSRF_FORMAT.test(existing) ? existing : generateCsrfToken();
  res.cookie('csrf_token', csrfToken, csrfCookieOptions);
  res.json({ csrfToken });
};

// POST /api/auth/signup
export const signup = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;

  // Hash first so the response time is the same whether or not the email exists
  const passwordHash = await hashPassword(password);

  // Role is hard-coded. It is never read from the request.
  const user = userStore.findByEmail(email)
    ? null
    : userStore.create({ email, passwordHash, role: 'user' });

  if (!user) {
    throw new AppError(409, 'Unable to create an account with those details. Try logging in instead.');
  }
    seedSampleWorkflows(user.id);

  const csrfToken = startSession(req, res, user, { rotateCsrf: true });
  res.status(201).json({ user: toPublic(user), csrfToken });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const user = userStore.findByEmail(email);

  if (!user) {
    await verifyAgainstDummy(password);
    throw new AppError(401, INVALID_LOGIN);
  }

  const locked = Boolean(user.lockUntil) && user.lockUntil > Date.now();
  const passwordOk = await verifyPassword(password, user.passwordHash);

  if (locked || !passwordOk) {
    if (!locked) registerFailedLogin(user.id); // attempts while locked do not extend the lock
    throw new AppError(401, INVALID_LOGIN);
  }

  if (!user.isActive) {
    throw new AppError(403, 'This account has been disabled. Contact an administrator.');
  }

  const updated = userStore.update(user.id, {
    failedLoginAttempts: 0,
    lockUntil: null,
    lastLoginAt: new Date().toISOString(),
  });
  if (!updated) throw new AppError(401, INVALID_LOGIN);

  const csrfToken = startSession(req, res, updated, { rotateCsrf: true });
  res.json({ user: toPublic(updated), csrfToken });
});

// POST /api/auth/refresh
export const refresh = asyncHandler(async (req, res) => {
  const reject = (family) => {
    if (family) refreshTokenStore.revokeFamily(family);
    clearSessionCookies(res);
    throw new AppError(401, 'Session expired. Please log in again.');
  };

  const token = req.cookies?.refresh_token;
  if (typeof token !== 'string' || !token) return reject();

  const record = refreshTokenStore.findByHash(hashToken(token));
  if (!record) return reject();

  // A revoked token being presented again means it may have been stolen
  if (record.revokedAt) return reject(record.family);
  if (record.expiresAt < Date.now()) return reject(record.family);

  const user = userStore.findById(record.userId);
  if (!user || !user.isActive) return reject(record.family);

  refreshTokenStore.revoke(record.id); // rotation: each token works once
  const csrfToken = startSession(req, res, user, { family: record.family });
  res.json({ user: toPublic(user), csrfToken });
});

// POST /api/auth/logout
export const logout = (req, res) => {
  const token = req.cookies?.refresh_token;
  if (typeof token === 'string' && token) {
    const record = refreshTokenStore.findByHash(hashToken(token));
    if (record) refreshTokenStore.revokeFamily(record.family);
  }
  clearSessionCookies(res);
  res.status(204).end();
};

// GET /api/auth/me
export const me = (req, res) => {
  res.json({ user: toPublic(req.user) });
};

// POST /api/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.validated.body;
  const user = req.user;

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw new AppError(400, 'Current password is incorrect.');
  if (currentPassword === newPassword) {
    throw new AppError(400, 'New password must be different from the current one.');
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = userStore.update(user.id, { passwordHash });

  // Sign out every other device, then start a fresh session for this one
  refreshTokenStore.revokeAllForUser(user.id);
  const csrfToken = startSession(req, res, updated, { rotateCsrf: true });

  res.json({ message: 'Password changed', user: toPublic(updated), csrfToken });
});