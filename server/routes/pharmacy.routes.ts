import { Router, Response } from 'express';
import { repository } from '../db/repository';
import { medicineSchema, medicineBatchSchema } from '../utils/validators';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';

export const pharmacyRouter = Router();

/**
 * GET /api/pharmacy/medicines
 * List medicines, stock levels, and associated active batches
 */
pharmacyRouter.get(
  '/medicines',
  requireAuth,
  requireRoles(['ADMIN', 'PHARMACIST', 'DOCTOR', 'NURSE']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const medicines = await repository.listMedicines();
      res.json({
        success: true,
        medicines,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/pharmacy/medicines
 * Register new medicine in hospital formulary
 */
pharmacyRouter.post(
  '/medicines',
  requireAuth,
  requireRoles(['ADMIN', 'PHARMACIST']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const validated = medicineSchema.parse(req.body);
      const medicine = await repository.createMedicine(validated);

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'ADD_MEDICINE',
        entityName: 'Medicine',
        entityId: medicine.id,
        detailsJson: JSON.stringify({ code: medicine.code, name: medicine.brandName }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        message: `Medicine ${medicine.brandName} added to hospital inventory.`,
        medicine,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/pharmacy/batches
 * Receive new stock shipment / purchase batch
 */
pharmacyRouter.post(
  '/batches',
  requireAuth,
  requireRoles(['ADMIN', 'PHARMACIST']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const validated = medicineBatchSchema.parse(req.body);

      // Verify expiry is in the future
      if (new Date(validated.expiryDate).getTime() <= Date.now()) {
        res.status(400).json({
          success: false,
          message: 'Cannot receive stock batch with an expired date.',
        });
        return;
      }

      const batch = await repository.addMedicineBatch(validated, req.user!.userId);

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'RECEIVE_STOCK_BATCH',
        entityName: 'MedicineBatch',
        entityId: batch.id,
        detailsJson: JSON.stringify({ batchNumber: batch.batchNumber, quantity: batch.purchaseQuantity }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        message: `Stock batch ${batch.batchNumber} logged and inventory updated.`,
        batch,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/pharmacy/alerts
 * Real-time low-stock and near-expiry warnings
 */
pharmacyRouter.get(
  '/alerts',
  requireAuth,
  requireRoles(['ADMIN', 'PHARMACIST', 'DOCTOR', 'NURSE']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const metrics = await repository.getDashboardMetrics();
      res.json({
        success: true,
        lowStockMedicines: metrics.lowStockMedicines,
        expiringBatches: metrics.expiringBatches,
      });
    } catch (err) {
      next(err);
    }
  }
);
