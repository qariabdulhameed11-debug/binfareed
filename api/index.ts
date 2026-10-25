import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server/app';
import { connectDatabase } from '../server/config/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await connectDatabase();
  } catch (err) {
    console.error('[Vercel Serverless DB Error]:', err);
  }

  // Restore original requested URL if rewritten by Vercel
  const matchedPath =
    (req.headers['x-matched-path'] as string) ||
    (req.headers['x-invoke-path'] as string) ||
    (req.headers['x-now-route-matches'] as string);

  if (matchedPath && !matchedPath.includes('/api/index')) {
    const queryIdx = req.url.indexOf('?');
    const queryString = queryIdx !== -1 ? req.url.slice(queryIdx) : '';
    req.url = (matchedPath.startsWith('/') ? matchedPath : `/${matchedPath}`) + queryString;
  }

  return app(req, res);
}
