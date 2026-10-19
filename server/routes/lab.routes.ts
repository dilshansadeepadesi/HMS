import { Router, Response } from 'express';
import { repository } from '../db/repository';
import { labRequestSchema, labResultEntrySchema } from '../utils/validators';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';

export const labRouter = Router();

/**
 * GET /api/lab/tests
 * Catalog of available laboratory investigations
 */
labRouter.get('/tests', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const tests = await repository.listLaboratoryTests();
    res.json({
      success: true,
      tests,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/lab/requests
 * List laboratory requests
 */
labRouter.get(
  '/requests',
  requireAuth,
  requireRoles(['ADMIN', 'DOCTOR', 'NURSE', 'LAB_STAFF']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const status = req.query.status as string | undefined;
      const patientId = req.query.patientId as string | undefined;
      const requests = await repository.listLaboratoryRequests({ status, patientId });
      res.json({
        success: true,
        requests,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/lab/requests
 * Clinician orders laboratory tests
 */
labRouter.post(
  '/requests',
  requireAuth,
  requireRoles(['ADMIN', 'DOCTOR']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const validated = labRequestSchema.parse(req.body);

      // Link doctor ID if doctor is logged in
      if (req.user!.role === 'DOCTOR') {
        const doc = await repository.findDoctorById(req.user!.userId);
        if (doc) validated.doctorId = doc.id;
      }

      const request = await repository.createLaboratoryRequest(validated);

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'ORDER_LAB_TEST',
        entityName: 'LaboratoryRequest',
        entityId: request.id,
        detailsJson: JSON.stringify({ requestNumber: request.requestNumber, patientId: request.patientId }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        message: `Laboratory request ${request.requestNumber} created successfully.`,
        request,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/lab/requests/:id/collect-sample
 * Phlebotomy / sample collection confirmation
 */
labRouter.patch(
  '/requests/:id/collect-sample',
  requireAuth,
  requireRoles(['ADMIN', 'LAB_STAFF', 'NURSE']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const updated = await repository.updateSampleCollection(req.params.id, req.user!.userId);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Request not found.' });
        return;
      }

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'SAMPLE_COLLECTED',
        entityName: 'LaboratoryRequest',
        entityId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Sample collection logged. Ready for laboratory analysis.',
        request: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/lab/results/enter
 * MLT enters tested numerical/qualitative parameters
 */
labRouter.post(
  '/results/enter',
  requireAuth,
  requireRoles(['ADMIN', 'LAB_STAFF']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { resultId, resultValuesJson, notes } = labResultEntrySchema.parse(req.body);

      const updated = await repository.enterLabResult(resultId, resultValuesJson, notes || undefined);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Laboratory result record not found.' });
        return;
      }

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'ENTER_LAB_RESULT',
        entityName: 'LaboratoryResult',
        entityId: resultId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Laboratory results entered successfully.',
        result: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/lab/results/verify
 * Verification and sign-off by MLT officer or Consultant Pathologist
 */
labRouter.post(
  '/results/verify',
  requireAuth,
  requireRoles(['ADMIN', 'LAB_STAFF', 'DOCTOR']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { resultId } = req.body;
      if (!resultId) {
        res.status(400).json({ success: false, message: 'Result ID is required.' });
        return;
      }

      const updated = await repository.verifyLabResult(resultId, req.user!.userId);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Laboratory result record not found.' });
        return;
      }

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'VERIFY_LAB_RESULT',
        entityName: 'LaboratoryResult',
        entityId: resultId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Laboratory result verified and released for clinical viewing.',
        result: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);
