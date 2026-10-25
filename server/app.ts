import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
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
app.get('/sitemap.xml', handleSitemap);
app.get('/robots.txt', handleRobots);

// Health check
app.get(['/api/health', '/health'], (_req, res) => {
  res.json({
    success: true,
    service: 'BinFareedStore API',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

// Mount API modular routes (supports both /api/prefix and direct path on Vercel)
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
