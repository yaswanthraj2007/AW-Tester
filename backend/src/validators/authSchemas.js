import { z } from 'zod';
import { passwordSchema } from '../utils/password.js';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long')
  .email('Enter a valid email address');

export const signupSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
});

// Login does not reveal the password policy, it only caps the length
export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});

export const changePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: passwordSchema,
});