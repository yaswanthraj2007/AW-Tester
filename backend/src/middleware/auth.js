import { verifyAccessToken } from '../utils/tokens.js';
import { userStore } from '../store/userStore.js';

const unauthenticated = (res) =>
  res.status(401).json({ message: 'Authentication required', code: 'AUTH_REQUIRED' });

export const authenticate = (req, res, next) => {
  const token = req.cookies?.access_token;
  if (typeof token !== 'string' || !token) return unauthenticated(res);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return unauthenticated(res);
  }

  const user = userStore.findById(payload.sub);
  if (!user || !user.isActive) return unauthenticated(res);

  req.user = user; // full record, used server-side only. Use toPublic() before sending.
  next();
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return unauthenticated(res);
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to perform this action' });
  }
  next();
};