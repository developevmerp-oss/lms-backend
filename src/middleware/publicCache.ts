import { Request, Response, NextFunction } from 'express';

/**
 * Protects the free Neon plan's monthly NETWORK TRANSFER quota (5 GB) and compute hours.
 *
 * Public pages (landing page, webinar page) call the same few endpoints for every visitor. Without a
 * cache each visit runs a database query and pulls the rows over the network. With this middleware
 * the answer is kept in server memory for a short time, so 1,000 visitors cost ONE query per
 * minute instead of 1,000. Browsers / CDNs are also told they may reuse the answer.
 *
 * Only use it on PUBLIC GET routes whose answer does not depend on who is logged in.
 * Any successful write request (POST/PUT/PATCH/DELETE) empties the cache, so admin edits show up at once.
 */

type Entry = { expires: number; status: number; body: string };

const store = new Map<string, Entry>();
const MAX_ENTRIES = 200; // protects memory if someone calls the API with endless different query strings

export const clearPublicCache = () => store.clear();

export const cachePublic = (ttlSeconds: number) => (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET') return next();

  const key = req.originalUrl;
  const cacheControl = `public, max-age=${ttlSeconds}`;
  res.vary('Origin'); // CORS header echoes the caller's origin, so shared caches must keep copies per origin

  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) {
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('X-Cache', 'HIT');
    return res.status(hit.status).type('application/json').send(hit.body);
  }

  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (res.statusCode === 200) {
      if (store.size >= MAX_ENTRIES) store.clear();
      store.set(key, { expires: Date.now() + ttlSeconds * 1000, status: 200, body: JSON.stringify(body) });
      res.setHeader('Cache-Control', cacheControl);
      res.setHeader('X-Cache', 'MISS');
    }
    return originalJson(body);
  };
  next();
};

/** Empties the public cache after any successful write so admins never see stale data. */
export const clearCacheOnWrite = (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' && req.method !== 'OPTIONS' && req.method !== 'HEAD') {
    res.on('finish', () => {
      if (res.statusCode < 400) clearPublicCache();
    });
  }
  next();
};

/**
 * Logs any response bigger than ~300 KB. If the Neon network quota ever drains fast again,
 * the Render logs will name the exact endpoint that is sending the large data.
 */
const HEAVY_RESPONSE_BYTES = 300 * 1024;
export const logHeavyResponses = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    const size = Number(res.getHeader('content-length') || 0);
    if (size >= HEAVY_RESPONSE_BYTES) {
      console.warn(`[Heavy response] ${req.method} ${req.originalUrl} -> ${(size / 1024 / 1024).toFixed(2)} MB`);
    }
  });
  next();
};
