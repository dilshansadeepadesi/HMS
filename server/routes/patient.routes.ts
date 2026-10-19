import { Router, Response } from 'express';
import { repository } from '../db/repository';
import { patientSchema } from '../utils/validators';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { validateSriLankanPhone } from '../utils/srilanka';

export const patientRouter = Router();

/**
 * GET /api/patients
 * List patients with server-side pagination and search
 */
patientRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const search = req.query.search as string | undefined;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);

    const result = await repository.listPatients({ search, page, limit });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/patients/:id
 * Retrieve patient profile, medical history, appointments, and billing
 */
patientRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const patient = await repository.findPatientById(req.params.id);
    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found.' });
      return;
    }

    // Role-based filtering of clinical notes: Receptionists and Accountants cannot view clinical diagnosis details
    const role = req.user!.role;
    const canViewClinical = ['ADMIN', 'DOCTOR', 'NURSE'].includes(role);

    const appointments = await repository.listAppointments({ patientId: patient.id });
    const medicalRecords = canViewClinical ? await repository.listMedicalRecords(patient.id) : [];
    const prescriptions = ['ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'].includes(role)
      ? await repository.listPrescriptions({ patientId: patient.id })
      : [];
    const labRequests = canViewClinical || role === 'LAB_STAFF'
      ? await repository.listLaboratoryRequests({ patientId: patient.id })
      : [];

    res.json({
      success: true,
      patient,
      canViewClinical,
      appointments,
      medicalRecords,
      prescriptions,
      labRequests,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/patients
 * Register a new patient with auto-generated Sri Lankan patient ID and validation
 */
patientRouter.post(
  '/',
  requireAuth,
  requireRoles(['ADMIN', 'RECEPTIONIST']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const validated = patientSchema.parse(req.body);

      // Normalize phone
      const phoneNorm = validateSriLankanPhone(validated.phone);
      if (phoneNorm.normalized) {
        validated.phone = phoneNorm.normalized;
      }

      // Check duplicate NIC if NIC is supplied
      if (validated.nic && validated.nic.trim()) {
        const { data: existing } = await repository.listPatients({ search: validated.nic.trim() });
        const duplicate = existing.find(
          (p) => p.nic && p.nic.toLowerCase() === validated.nic!.trim().toLowerCase()
        );
        if (duplicate) {
          res.status(400).json({
            success: false,
            message: `A patient with NIC ${validated.nic} is already registered (${duplicate.fullName} - ${duplicate.patientId}).`,
          });
          return;
        }
      }

      const newPatient = await repository.createPatient(validated);

      // Audit log
      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'REGISTER_PATIENT',
        entityName: 'Patient',
        entityId: newPatient.id,
        detailsJson: JSON.stringify({ patientId: newPatient.patientId, fullName: newPatient.fullName }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        message: `Patient ${newPatient.fullName} registered successfully with ID ${newPatient.patientId}.`,
        patient: newPatient,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/patients/:id
 * Update patient demographic & contact info
 */
patientRouter.put(
  '/:id',
  requireAuth,
  requireRoles(['ADMIN', 'RECEPTIONIST']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const validated = patientSchema.parse(req.body);
      const updated = await repository.updatePatient(req.params.id, validated);

      if (!updated) {
        res.status(404).json({ success: false, message: 'Patient not found.' });
        return;
      }

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'UPDATE_PATIENT',
        entityName: 'Patient',
        entityId: updated.id,
        detailsJson: JSON.stringify({ patientId: updated.patientId }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Patient details updated successfully.',
        patient: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/patients/:id
 * Delete patient record
 */
patientRouter.delete(
  '/:id',
  requireAuth,
  requireRoles(['ADMIN', 'RECEPTIONIST']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const success = await repository.deletePatient(req.params.id);
      if (!success) {
        res.status(404).json({ success: false, message: 'Patient not found.' });
        return;
      }

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'DELETE_PATIENT',
        entityName: 'Patient',
        entityId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Patient record deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
);
