import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (now > record.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * In-memory sliding window rate limiter
 */
export function createRateLimiter(options?: {
  windowMs?: number;
  maxAttempts?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) {
  const windowMs = options?.windowMs || config.rateLimitWindowMs;
  const maxAttempts = options?.maxAttempts || config.rateLimitMaxAttempts;
  const message = options?.message || 'Too many requests. Please try again later.';
  const keyGen = options?.keyGenerator || ((req: Request) => req.ip || req.socket.remoteAddress || 'unknown');

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGen(req);
    const now = Date.now();
    const record = memoryStore.get(key);

    if (!record || now > record.resetTime) {
      memoryStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (record.count >= maxAttempts) {
      const waitSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.status(429).json({
        success: false,
        message: `${message} (Lockout active for ${waitSeconds} seconds)`,
        retryAfter: waitSeconds,
      });
      return;
    }

    record.count += 1;
    next();
  };
}

export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  maxAttempts: 5, // 5 failed attempts allowed
  message: 'Too many failed login attempts. For security reasons, your IP is temporarily blocked.',
  keyGenerator: (req) => `login_${req.ip || 'ip'}_${req.body?.username || ''}`,
});
