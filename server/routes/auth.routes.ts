import { Router, Response } from 'express';
import { repository } from '../db/repository';
import { verifyPassword, hashPassword, validatePasswordStrength } from '../utils/password';
import { signSessionToken } from '../utils/token';
import { loginSchema, changePasswordSchema } from '../utils/validators';
import { loginRateLimiter } from '../middleware/rateLimiter';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { config } from '../config';

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Brute-force protected, generic error response, HttpOnly cookie session
 */
authRouter.post('/login', loginRateLimiter, async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await repository.findUserByUsername(username);

    // Timing attack resistance: always execute verifyPassword even if user doesn't exist
    const dummyHash = '$2a$12$e80yqR9G002WzZ.1234567890123456789012345678901234567890';
    const isValid = user
      ? await verifyPassword(password, user.passwordHash)
      : await verifyPassword(password, dummyHash);

    if (!user || !isValid) {
      await repository.recordAudit({
        username,
        userRole: 'ANONYMOUS',
        action: 'FAILED_LOGIN',
        entityName: 'User',
        detailsJson: JSON.stringify({ message: 'Invalid username or password' }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Generic authentication error message (never reveal if account exists)
      res.status(401).json({
        success: false,
        message: 'Invalid username or password. Please verify your credentials.',
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact the MediPlus system administrator.',
      });
      return;
    }

    // Sign session token
    const token = signSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
    });

    // Set secure cookie
    res.cookie('mediplus_session', token, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    // Update last login
    await repository.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

    // Audit log
    await repository.recordAudit({
      userId: user.id,
      username: user.username,
      userRole: user.role,
      action: 'LOGIN_SUCCESS',
      entityName: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
      },
      token, // Also return token for clients using Authorization header
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 */
authRouter.post('/logout', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (req.user) {
      await repository.recordAudit({
        userId: req.user.userId,
        username: req.user.username,
        userRole: req.user.role,
        action: 'LOGOUT',
        entityName: 'User',
        entityId: req.user.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    }

    res.clearCookie('mediplus_session', {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'lax',
    });

    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 */
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = await repository.findUserById(req.user!.userId);
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Session invalid or user deactivated.' });
      return;
    }

    const { passwordHash, ...safeUser } = user;
    res.json({
      success: true,
      user: safeUser,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/change-password
 */
authRouter.post('/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await repository.findUserById(req.user!.userId);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const isMatch = await verifyPassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Incorrect current password.' });
      return;
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.isValid) {
      res.status(400).json({ success: false, message: strength.message });
      return;
    }

    await repository.updateUser(user.id, { password: newPassword });

    await repository.recordAudit({
      userId: user.id,
      username: user.username,
      userRole: user.role,
      action: 'PASSWORD_CHANGE',
      entityName: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/demo-users
 * Provided for easy role switching during demonstration/evaluation in non-production.
 * Does NOT expose passwords or sensitive tokens.
 */
authRouter.get('/demo-users', async (req, res, next) => {
  try {
    if (config.isProduction) {
      res.status(404).json({ success: false, message: 'Not found.' });
      return;
    }

    const users = await repository.listUsers();
    const demoAccounts = users.map((u) => ({
      username: u.username,
      fullName: u.fullName,
      role: u.role,
    }));

    res.json({
      success: true,
      demoAccounts,
    });
  } catch (err) {
    next(err);
  }
});
