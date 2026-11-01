import { config } from '../config/index.js';

export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const notFound = (req, res) => {
  res.status(404).json({ message: 'Route not found' });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err?.status || err?.statusCode || 500;
  const message = status === 500 ? 'Internal server error' : (err?.message || 'Error occurred');

  // Log details server-side only, never log bodies, cookies or tokens
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${status}: ${err?.message || err}`);
  if (!config.isProd && status === 500 && err?.stack) console.error(err.stack);

  res.status(status).json({
    message,
  });
};
