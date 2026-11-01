import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';

const COST = 12;

const prehash = (password) =>
  crypto.createHash('sha256').update(password, 'utf8').digest('base64');

export const hashPassword = (password) => bcrypt.hash(prehash(password), COST);

export const verifyPassword = (password, hash) =>
  bcrypt.compare(prehash(password), hash);

// Computed once at startup, used to equalize timing for unknown users
const DUMMY_HASH = bcrypt.hashSync(prehash(crypto.randomBytes(16).toString('hex')), COST);

export const verifyAgainstDummy = (password) =>
  bcrypt.compare(prehash(password), DUMMY_HASH);

// Small starter list. Expand it later (e.g. top 10k common passwords file).
const COMMON = new Set([
  'password', 'password1', 'password123', '1234567890', '123456789',
  'qwertyuiop', 'qwerty123', 'iloveyou12', 'admin12345', 'welcome123',
  'letmein123', 'abc1234567', 'changeme123', 'p@ssw0rd123',
]);

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/[0-9]/, 'Password needs a number')
  .regex(/[^A-Za-z0-9]/, 'Password needs a symbol')
  .refine((p) => !COMMON.has(p.toLowerCase()), 'Password is too common');