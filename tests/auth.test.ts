import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../server/utils/password';
import { signSessionToken, verifySessionToken } from '../server/utils/token';

describe('Authentication and Cryptography', () => {
  it('should securely hash and verify passwords with bcrypt', async () => {
    const raw = 'SecurePass@2026!';
    const hash = await hashPassword(raw);
    expect(hash).not.toBe(raw);
    expect(hash.startsWith('$2')).toBe(true);

    const isMatch = await verifyPassword(raw, hash);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPassword('WrongPassword', hash);
    expect(isWrong).toBe(false);
  });

  it('should validate strong password policy', () => {
    expect(validatePasswordStrength('Weak').isValid).toBe(false);
    expect(validatePasswordStrength('nocapitals123!').isValid).toBe(false);
    expect(validatePasswordStrength('NOLOWERCASE123!').isValid).toBe(false);
    expect(validatePasswordStrength('NoSpecialChar123').isValid).toBe(false);
    expect(validatePasswordStrength('GoodPass@2026!').isValid).toBe(true);
  });

  it('should sign and verify session JWTs', () => {
    const payload = {
      userId: 'test-123',
      username: 'admin',
      role: 'ADMIN',
      fullName: 'System Administrator',
    };

    const token = signSessionToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe('test-123');
    expect(decoded?.role).toBe('ADMIN');
  });
});
