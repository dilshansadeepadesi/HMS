import { Request, Response, NextFunction } from 'express';
import { verifySessionToken, TokenPayload } from '../utils/token';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Middleware to extract and verify the session token from cookie or Authorization header
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Check cookie first
  let token = req.cookies?.mediplus_session;

  // Check Authorization header fallback
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    req.user = undefined;
    return next();
  }

  const payload = verifySessionToken(token);
  if (payload) {
    req.user = payload;
  } else {
    req.user = undefined;
  }

  next();
}

/**
 * Middleware requiring authentication
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in to proceed.',
    });
    return;
  }
  next();
}

/**
 * Middleware requiring specific roles
 */
export function requireRoles(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to perform this action.',
      });
      return;
    }

    next();
  };
}
