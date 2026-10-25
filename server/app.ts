import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import mongoose from 'mongoose';
import { env } from './config/env';
import { connectDatabase } from './config/db';
import {
  sanitizeNoSqlInjection,
  csrfProtection,
  apiRateLimiter,
} from './middleware/security';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import contentRoutes, { handleSitemap, handleRobots } from './routes/contentRoutes';
import cartOrderRoutes from './routes/cartOrderRoutes';
import adminRoutes from './routes/adminRoutes';
import pushRoutes from './routes/pushRoutes';

const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS with credentials support
app.use(
  cors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) return callback(null, true);
      const isVercel = requestOrigin.endsWith('.vercel.app');
      const isLocal =
        requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1');
      if (isVercel || isLocal || (env.FRONTEND_URL && requestOrigin === env.FRONTEND_URL)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Normalize URL from Vercel rewrites
app.use((req, _res, next) => {
  const matched = (req.headers['x-matched-path'] as string) || (req.headers['x-invoke-path'] as string);
  if (matched && (req.url === '/api' || req.url === '/' || req.url === '/api/index')) {
    const queryIdx = req.url.indexOf('?');
    const queryString = queryIdx !== -1 ? req.url.slice(queryIdx) : '';
    req.url = matched + queryString;
  }
  next();
});

let lastDbError: string | null = null;

// Health Check - Responds immediately with server & DB status
app.get(['/api/health', '/health'], async (_req, res) => {
  const rawUri = env.MONGODB_URI || '';
  const maskedUri = rawUri ? rawUri.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1***$3') : 'none';

  res.json({
    success: true,
    service: 'BinFareedStore API',
    status: 'operational',
    dbState: mongoose.connection.readyState,
    dbConnected: mongoose.connection.readyState === 1,
    dbError: lastDbError,
    dbUri: maskedUri,
    timestamp: new Date().toISOString(),
  });
});

// Diagnostic DB Test Endpoint
app.get(['/api/test-db', '/test-db'], async (_req, res) => {
  const start = Date.now();
  try {
    const result = await connectDatabase();
    res.json({
      success: true,
      timeMs: Date.now() - start,
      dbState: mongoose.connection.readyState,
      isMemory: result.isMemory,
      message: 'MongoDB Atlas connected successfully from Vercel!'
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      timeMs: Date.now() - start,
      dbState: mongoose.connection.readyState,
      errorName: err.name,
      errorMessage: err.message,
    });
  }
});

// Auto-connect database for all functional routes
app.use(async (req, res, next) => {
  if (req.path === '/api/health' || req.path === '/health' || req.path === '/api/test-db' || req.path === '/test-db') {
    return next();
  }
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDatabase();
      lastDbError = null;
    } catch (err: any) {
      lastDbError = err?.message || String(err);
      console.error('[DB Auto-Connect Error]:', err);
      return res.status(503).json({
        success: false,
        message: 'Database connection failed. Please ensure MongoDB Atlas Network Access allows 0.0.0.0/0.',
        error: err.message,
      });
    }
  }
  next();
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// NoSQL injection sanitization & CSRF origin verification
app.use(sanitizeNoSqlInjection);
app.use(csrfProtection);
app.use(['/api', '/'], apiRateLimiter);

// Serve local uploaded images
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// SEO Sitemap & Robots
app.get(['/sitemap.xml', '/api/sitemap.xml'], handleSitemap);
app.get(['/robots.txt', '/api/robots.txt'], handleRobots);

// Mount API modular routes (supports both /api/path and /path on Vercel)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/products', '/products'], productRoutes);
app.use(['/api/content', '/content'], contentRoutes);
app.use(['/api/push', '/push'], pushRoutes);
app.use(['/api/admin', '/admin'], adminRoutes);
app.use(['/api', '/'], cartOrderRoutes);

// 404 handler for unknown API routes
app.use(['/api/*', '/auth/*', '/products/*', '/content/*', '/push/*'], (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.',
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
