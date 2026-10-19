import { Router, Response } from 'express';
import { repository } from '../db/repository';
import { medicalRecordSchema, dispensePrescriptionSchema } from '../utils/validators';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';

export const emrRouter = Router();

/**
 * GET /api/emr/records
 * Restricted to clinical roles (Doctor, Nurse, Admin)
 */
emrRouter.get(
  '/records',
  requireAuth,
  requireRoles(['ADMIN', 'DOCTOR', 'NURSE']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const patientId = req.query.patientId as string | undefined;
      const records = await repository.listMedicalRecords(patientId);
      res.json({
        success: true,
        records,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/emr/records
 * Create clinical note, vitals, diagnosis, and prescription (Doctor only)
 */
emrRouter.post(
  '/records',
  requireAuth,
  requireRoles(['ADMIN', 'DOCTOR']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const validated = medicalRecordSchema.parse(req.body);

      // Verify doctor profile exists or matches logged in doctor
      if (req.user!.role === 'DOCTOR') {
        const doc = await repository.findDoctorById(req.user!.userId);
        if (doc) {
          validated.doctorId = doc.id;
        }
      }

      const record = await repository.createMedicalRecord(validated);

      // Mark appointment as COMPLETED if linked
      if (validated.appointmentId) {
        await repository.updateAppointmentStatus(validated.appointmentId, 'COMPLETED');
      }

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'CREATE_EMR_RECORD',
        entityName: 'MedicalRecord',
        entityId: record.id,
        detailsJson: JSON.stringify({ patientId: record.patientId, diagnosis: record.diagnosis }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        message: 'Clinical record and treatment plan saved successfully.',
        record,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/emr/prescriptions
 * View prescriptions (Doctor, Nurse, Pharmacist, Admin)
 */
emrRouter.get(
  '/prescriptions',
  requireAuth,
  requireRoles(['ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const patientId = req.query.patientId as string | undefined;
      const status = req.query.status as string | undefined;
      const prescriptions = await repository.listPrescriptions({ patientId, status });
      res.json({
        success: true,
        prescriptions,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/emr/prescriptions/dispense
 * Pharmacist dispensing against prescription with batch & expiry verification
 */
emrRouter.post(
  '/prescriptions/dispense',
  requireAuth,
  requireRoles(['ADMIN', 'PHARMACIST']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const validated = dispensePrescriptionSchema.parse(req.body);

      const dispensed = await repository.dispensePrescription(
        validated.prescriptionId,
        validated.items,
        req.user!.userId
      );

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'DISPENSE_PRESCRIPTION',
        entityName: 'Prescription',
        entityId: dispensed.id,
        detailsJson: JSON.stringify({ prescriptionNo: dispensed.prescriptionNo }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: `Prescription ${dispensed.prescriptionNo} dispensed successfully and inventory updated.`,
        prescription: dispensed,
      });
    } catch (err: any) {
      if (err.message && (err.message.includes('expired') || err.message.includes('Insufficient'))) {
        res.status(400).json({ success: false, message: err.message });
        return;
      }
      next(err);
    }
  }
);
