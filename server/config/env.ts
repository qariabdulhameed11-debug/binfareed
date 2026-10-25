import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'bfs_dev_jwt_secret_key_99887766554433221100_luxury_horology',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'safepay',
  PAYMENT_API_KEY: process.env.PAYMENT_API_KEY || '',
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || 'bfs_dev_webhook_secret_2026',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@binfareedstore.pk',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@BinFareed2026!',
};

// The fallback JWT secret is public (it's in this file and the README). Anyone who
// knows it can forge an admin session, so a real database must never use it.
const DEFAULT_JWT_SECRET = 'bfs_dev_jwt_secret_key_99887766554433221100_luxury_horology';
if (env.MONGODB_URI && (env.JWT_SECRET === DEFAULT_JWT_SECRET || env.JWT_SECRET.length < 32)) {
  throw new Error(
    'JWT_SECRET is missing, too short, or the public default. Set a random value of 64+ characters in .env.'
  );
}
