import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server/app';
import { connectDatabase } from '../server/config/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await connectDatabase();
  } catch (err) {
    console.error('[Vercel Serverless DB Error]:', err);
  }
  return app(req, res);
}
