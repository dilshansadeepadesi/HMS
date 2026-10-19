import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  fullName: string;
}

/**
 * Sign JWT session token
 */
export function signSessionToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.sessionExpiry,
  } as jwt.SignOptions);
}

/**
 * Verify JWT session token
 */
export function verifySessionToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    return decoded;
  } catch (err) {
    return null;
  }
}
