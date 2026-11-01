import { v4 as uuid } from 'uuid';

// TODO(MySQL): `refresh_tokens` table (id, user_id, token_hash UNIQUE,
// family, expires_at, revoked_at, replaced_by). Index token_hash and user_id.
const tokens = new Map(); // id -> record
const hashIndex = new Map(); // tokenHash -> id

export const refreshTokenStore = {
  create({ userId, tokenHash, family, expiresAt }) {
    const record = {
      id: uuid(),
      userId,
      tokenHash,
      family,
      expiresAt, // ms timestamp
      revokedAt: null,
      createdAt: Date.now(),
    };
    tokens.set(record.id, record);
    hashIndex.set(tokenHash, record.id);
    return record;
  },

  findByHash(tokenHash) {
    const id = hashIndex.get(tokenHash);
    return id ? tokens.get(id) : null;
  },

  revoke(id) {
    const t = tokens.get(id);
    if (t && !t.revokedAt) t.revokedAt = Date.now();
  },

  revokeFamily(family) {
    for (const t of tokens.values()) {
      if (t.family === family && !t.revokedAt) t.revokedAt = Date.now();
    }
  },

  revokeAllForUser(userId) {
    for (const t of tokens.values()) {
      if (t.userId === userId && !t.revokedAt) t.revokedAt = Date.now();
    }
  },

  purgeExpired() {
    const now = Date.now();
    for (const [id, t] of tokens.entries()) {
      if (t.expiresAt < now) {
        hashIndex.delete(t.tokenHash);
        tokens.delete(id);
      }
    }
  },
};
