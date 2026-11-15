import type { NextFunction, Request, Response } from 'express';
import { getSessionUser } from './db.ts';
import type { AdminSessionUser } from '../types/portfolio.ts';

export const SESSION_COOKIE_NAME = 'mithila_admin_session';

export interface AuthenticatedRequest extends Request {
  adminUser?: AdminSessionUser;
}

// --- Sliding-Window Rate Limiter ---
interface RateBucket {
  timestamps: number[];
}

const rateBuckets = new Map<string, RateBucket>();

export function createRateLimiter(options: { windowMs: number; max: number; keyPrefix: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const key = `${options.keyPrefix}:${ip}`;
    const now = Date.now();
    const cutoff = now - options.windowMs;

    const bucket = rateBuckets.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

    if (bucket.timestamps.length >= options.max) {
      const oldest = bucket.timestamps[0] ?? now;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: `Too many requests. Please try again in ${retryAfterSec} seconds.`,
      });
    }

    bucket.timestamps.push(now);
    rateBuckets.set(key, bucket);
    next();
  };
}

// --- Security Headers ---
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  next();
}

// --- CSRF Protection for Mutating API Requests ---
export function requireCsrfHeader(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  // Require custom header that cross-site HTML forms cannot forge
  const requestedWith = req.headers['x-requested-with'];
  if (requestedWith !== 'XMLHttpRequest') {
    return res.status(403).json({ error: 'Forbidden: missing security header' });
  }

  // Validate Origin/Host consistency when Origin header is present
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return res.status(403).json({ error: 'Forbidden: origin mismatch' });
      }
    } catch {
      return res.status(403).json({ error: 'Forbidden: invalid origin' });
    }
  }

  next();
}

// --- Admin Authentication & RBAC Middleware ---
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const user = getSessionUser(token);
  if (!user || user.role !== 'admin') {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  req.adminUser = user;
  next();
}

// --- Input Sanitization & Validation ---
export function sanitizePlainText(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  // Strip control characters except newlines/tabs, collapse null bytes, trim
  return input
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function sanitizeSafeUrl(url: unknown): string {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  // Allow relative upload paths
  if (trimmed.startsWith('/uploads/') || trimmed === 'default') {
    return trimmed.slice(0, 500);
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString().slice(0, 500);
    }
    return '';
  } catch {
    return '';
  }
}

// --- File Upload Magic-Byte Inspection ---
export function detectImageExtension(buffer: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }
  // WEBP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

export function isValidPdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}
