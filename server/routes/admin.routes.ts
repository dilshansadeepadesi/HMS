import { Router, Response } from 'express';
import { repository } from '../db/repository';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { validatePasswordStrength } from '../utils/password';

export const adminRouter = Router();

/**
 * GET /api/admin/users
 */
adminRouter.get(
  '/users',
  requireAuth,
  requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const users = await repository.listUsers();
      res.json({
        success: true,
        users,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/admin/users
 * Administrator creates new staff user account
 */
adminRouter.post(
  '/users',
  requireAuth,
  requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { username, email, password, fullName, role, phone } = req.body;

      if (!username || !email || !password || !fullName || !role) {
        res.status(400).json({ success: false, message: 'All required fields must be provided.' });
        return;
      }

      const strength = validatePasswordStrength(password);
      if (!strength.isValid) {
        res.status(400).json({ success: false, message: strength.message });
        return;
      }

      // Check existing username
      const existing = await repository.findUserByUsername(username);
      if (existing) {
        res.status(400).json({ success: false, message: 'Username is already taken.' });
        return;
      }

      const newUser = await repository.createUser({
        username,
        email,
        password,
        fullName,
        role,
        phone,
      });

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'CREATE_USER',
        entityName: 'User',
        entityId: newUser.id,
        detailsJson: JSON.stringify({ username: newUser.username, role: newUser.role }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        message: `User ${newUser.username} (${newUser.role}) created successfully.`,
        user: newUser,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/admin/users/:id/status
 */
adminRouter.patch(
  '/users/:id/status',
  requireAuth,
  requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { isActive, role } = req.body;
      const updates: any = {};
      if (typeof isActive === 'boolean') updates.isActive = isActive;
      if (role) updates.role = role;

      const updated = await repository.updateUser(req.params.id, updates);
      if (!updated) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'UPDATE_USER_STATUS',
        entityName: 'User',
        entityId: req.params.id,
        detailsJson: JSON.stringify(updates),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'User account status updated.',
        user: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/audit-logs
 * Security & compliance audit log viewer
 */
adminRouter.get(
  '/audit-logs',
  requireAuth,
  requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const action = req.query.action as string | undefined;
      const limit = parseInt((req.query.limit as string) || '100', 10);

      const logs = await repository.listAuditLogs({ action, limit });
      res.json({
        success: true,
        logs,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/settings
 * Retrieve hospital settings & branding
 */
adminRouter.get('/settings', async (req, res, next) => {
  try {
    const settings = await repository.getSettings();
    res.json({
      success: true,
      settings,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/settings
 */
adminRouter.post(
  '/settings',
  requireAuth,
  requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { settings } = req.body;
      if (!settings || typeof settings !== 'object') {
        res.status(400).json({ success: false, message: 'Invalid settings payload.' });
        return;
      }

      for (const [k, v] of Object.entries(settings)) {
        await repository.updateSetting(k, String(v));
      }

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'UPDATE_SYSTEM_SETTINGS',
        entityName: 'SystemSetting',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Hospital system settings updated.',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/admin/logo
 * Upload and update hospital logo (validates base64 data URI / image format and size)
 */
adminRouter.post(
  '/logo',
  requireAuth,
  requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { logoDataUri } = req.body;
      if (!logoDataUri || typeof logoDataUri !== 'string') {
        res.status(400).json({ success: false, message: 'Logo data URI is required.' });
        return;
      }

      // Check allowed mime types
      const allowedRegex = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;
      const match = logoDataUri.match(allowedRegex);

      if (!match) {
        res.status(400).json({
          success: false,
          message: 'Invalid logo format. Only validated PNG, JPEG, and WebP images are permitted.',
        });
        return;
      }

      // Size check: max 2MB
      const base64Data = match[2];
      const approxSizeBytes = (base64Data.length * 3) / 4;
      if (approxSizeBytes > 2 * 1024 * 1024) {
        res.status(400).json({
          success: false,
          message: 'Logo file size exceeds the 2MB limit.',
        });
        return;
      }

      await repository.updateSetting('hospital_logo_url', logoDataUri);

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'UPDATE_HOSPITAL_LOGO',
        entityName: 'SystemSetting',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Hospital branding logo updated successfully.',
        logoUrl: logoDataUri,
      });
    } catch (err) {
      next(err);
    }
  }
);
