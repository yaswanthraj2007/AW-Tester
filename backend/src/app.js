import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { globalLimiter, adminLimiter } from './middleware/rateLimiters.js';
import { csrfProtection } from './middleware/csrf.js';
import { authenticate, authorize } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import workflowRoutes from './routes/workflows.js';
import runRoutes from './routes/runs.js';
import quickTestRoutes from './routes/quickTest.js';

const app = express();

app.disable('x-powered-by');
if (config.isProd) app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    frameguard: { action: 'deny' },
  })
);

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

const allowedOrigins = [config.frontendOrigin];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, !config.isProd);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      const err = new Error('Origin not allowed by CORS');
      err.status = 403;
      return callback(err);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    maxAge: 600,
  })
);

app.use(globalLimiter);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(hpp());

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// CSRF check for every state-changing /api request
app.use('/api', csrfProtection);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminLimiter, authenticate, authorize('admin'), adminRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/quick-test', quickTestRoutes);

app.use(notFound);
app.use(errorHandler);


export default app;