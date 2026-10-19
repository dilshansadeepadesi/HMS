import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * Applies security headers (CSP, X-Frame-Options, HSTS, etc.)
 */
export function applySecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Strict MIME type checking
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent browser XSS filtering vulnerabilities
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // Vite/React runtime
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);

  // Strict Transport Security in production
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
}

/**
 * Centralized error handler that sanitizes all error messages for clients
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  // Log error internally on the server (without logging passwords/secrets)
  if (!config.isProduction) {
    console.error('[SERVER_ERROR]', err?.message || err);
  }

  // Handle Zod Validation Errors
  if (err?.name === 'ZodError') {
    const issues = err.issues?.map((i: any) => ({
      field: i.path.join('.'),
      message: i.message,
    })) || [];
    res.status(400).json({
      success: false,
      message: 'Validation failed. Please verify your submitted information.',
      errors: issues,
    });
    return;
  }

  // Generic status and safe user message
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  
  // Never leak database or internal stack trace errors
  const safeMessage = statusCode === 500
    ? 'An unexpected error occurred. Please contact the MediPlus system administrator if this persists.'
    : err.message || 'Operation could not be completed.';

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
  });
}
