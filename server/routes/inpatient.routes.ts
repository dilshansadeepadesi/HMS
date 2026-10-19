import { Router, Response } from 'express';
import { repository } from '../db/repository';
import { admissionSchema, dischargeSchema } from '../utils/validators';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { formatLKR } from '../utils/srilanka';

export const inpatientRouter = Router();

/**
 * GET /api/inpatient/wards
 */
inpatientRouter.get('/wards', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const wards = await repository.listWards();
    res.json({
      success: true,
      wards: wards.map((w) => ({
        ...w,
        dailyRateFormatted: formatLKR(w.dailyRate),
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/inpatient/admissions
 */
inpatientRouter.get('/admissions', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const status = req.query.status as string | undefined;
    const admissions = await repository.listAdmissions(status);
    res.json({
      success: true,
      admissions: admissions.map((a) => ({
        ...a,
        dailyChargeRateFormatted: formatLKR(a.dailyChargeRate),
        totalWardChargeFormatted: formatLKR(a.totalWardCharge),
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/inpatient/admissions
 * Inpatient admission & bed assignment
 */
inpatientRouter.post(
  '/admissions',
  requireAuth,
  requireRoles(['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const validated = admissionSchema.parse(req.body);

      const admission = await repository.admitPatient(validated);

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'ADMIT_PATIENT',
        entityName: 'Admission',
        entityId: admission.id,
        detailsJson: JSON.stringify({
          admissionNumber: admission.admissionNumber,
          patientId: admission.patientId,
          wardId: admission.wardId,
          bedId: admission.bedId,
        }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        message: `Patient admitted under admission #${admission.admissionNumber}.`,
        admission,
      });
    } catch (err: any) {
      if (err.message && err.message.includes('not available')) {
        res.status(409).json({ success: false, message: err.message });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/inpatient/discharge
 * Discharge patient, calculate total ward charges, free bed
 */
inpatientRouter.post(
  '/discharge',
  requireAuth,
  requireRoles(['ADMIN', 'DOCTOR', 'NURSE']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { admissionId, dischargeSummary } = dischargeSchema.parse(req.body);

      const discharged = await repository.dischargePatient(admissionId, dischargeSummary);

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'DISCHARGE_PATIENT',
        entityName: 'Admission',
        entityId: discharged.id,
        detailsJson: JSON.stringify({
          admissionNumber: discharged.admissionNumber,
          totalWardCharge: discharged.totalWardCharge,
        }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: `Patient discharged. Ward charge total calculated: ${formatLKR(discharged.totalWardCharge)}.`,
        admission: discharged,
      });
    } catch (err) {
      next(err);
    }
  }
);
