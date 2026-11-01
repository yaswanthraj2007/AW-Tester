import { v4 as uuid } from 'uuid';

const users = new Map(); // id -> user
const emailIndex = new Map(); // email -> id

const UPDATABLE = new Set([
  'passwordHash',
  'role',
  'isActive',
  'failedLoginAttempts',
  'lockUntil',
  'lastLoginAt',
]);

// Named export required by check-step2.js
export const toPublic = (user) => {
  if (!user) return null;
  const { passwordHash, failedLoginAttempts, lockUntil, ...safe } = user;
  return safe;
};

export const userStore = {
  create({ email, passwordHash, role = 'user' }) {
    if (emailIndex.has(email)) return null;
    const now = new Date().toISOString();
    const user = {
      id: uuid(),
      email,
      passwordHash,
      role,
      isActive: true,
      failedLoginAttempts: 0,
      lockUntil: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };
    users.set(user.id, user);
    emailIndex.set(email, user.id);
    return user;
  },
  findById(id) {
    return users.get(id) || null;
  },
  findByEmail(email) {
    const id = emailIndex.get(email);
    return id ? users.get(id) : null;
  },
  update(id, patch) {
    const user = users.get(id);
    if (!user) return null;
    for (const [key, value] of Object.entries(patch)) {
      if (UPDATABLE.has(key)) user[key] = value;
    }
    user.updatedAt = new Date().toISOString();
    return user;
  },
  list() {
    return [...users.values()];
  },
  countActiveAdmins() {
    return [...users.values()].filter((u) => u.role === 'admin' && u.isActive).length;
  },
  delete(id) {
    const user = users.get(id);
    if (!user) return false;
    emailIndex.delete(user.email);
    return users.delete(id);
  },
};