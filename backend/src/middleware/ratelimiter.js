import rateLimit from 'express-rate-limit';

const make = (windowMinutes, max, message, extra = {}) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const reset = req.rateLimit?.resetTime;
      const seconds = reset
        ? Math.max(1, Math.ceil((reset.getTime() - Date.now()) / 1000))
        : windowMinutes * 60;
      res.set('Retry-After', String(seconds));
      res.status(429).json({ message });
    },
    // store: swap in a Redis store here later
    ...extra,
  });

// An SPA that polls run status needs more than 100 requests per 15 minutes
export const globalLimiter = make(15, 300, 'Too many requests. Please try again later.');
export const authLimiter = make(15, 10, 'Too many attempts. Please try again in 15 minutes.');
export const refreshLimiter = make(15, 30, 'Too many session refreshes. Please try again later.');
export const adminLimiter = make(15, 50, 'Too many admin requests. Please try again later.');

// Counted per logged-in user. Only use it after authenticate().
export const runLimiter = make(10, 10, 'Too many test runs. Please wait a few minutes.', {
  keyGenerator: (req) => req.user.id,
});