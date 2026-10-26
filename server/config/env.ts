import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '5005', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5174',
  MONGODB_URI:
    process.env.MONGODB_URI ||
    'mongodb+srv://sp2023it023_db_user:nPLkZUf2JJvl7Z3v@cluster0.fpuclkn.mongodb.net/binfareedstore?appName=Cluster0',
  JWT_SECRET:
    process.env.JWT_SECRET ||
    'bOMYx--5brT5JwMtfgA7Go-a6-MJxNTYssJnaczG3mqalSy7SpLTByTkX5TSM28Z',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'safepay',
  PAYMENT_API_KEY: process.env.PAYMENT_API_KEY || '',
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || 'bfs_dev_webhook_secret_2026',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@binfareedstore.pk',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '3w?d*@vaYJG52$bHr4',
  VAPID_PUBLIC_KEY:
    process.env.VAPID_PUBLIC_KEY ||
    'BLuQM81lJ1D7koXb354lkWZC3JcAn5MulAAaw0WbkP_xCUy9d3Ia-bXoW374LoMskV78sCJW1Md3NXA6nxhOKCk',
  VAPID_PRIVATE_KEY:
    process.env.VAPID_PRIVATE_KEY || 'ZqUFVP_7RUZc-SJ99PbWLX9_3pyibDPS3M3Sk_Xv7IU',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:bffareedstore@gmail.com',
};

// Check JWT secret and warn if insecure, but never crash the server
const DEFAULT_INSECURE_SECRET = 'bfs_dev_jwt_secret_key_99887766554433221100_luxury_horology';
if (env.JWT_SECRET === DEFAULT_INSECURE_SECRET) {
  console.warn('[Security Warning]: Default JWT secret is in use. Set JWT_SECRET in production.');
}
