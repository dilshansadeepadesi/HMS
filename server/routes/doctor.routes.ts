import { Router, Response } from 'express';
import { repository } from '../db/repository';
import { doctorSchema } from '../utils/validators';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';

export const doctorRouter = Router();

/**
 * GET /api/doctors
 */
doctorRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const doctors = await repository.listDoctors();
    res.json({
      success: true,
      doctors,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/doctors/departments
 */
doctorRouter.get('/departments', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const departments = await repository.listDepartments();
    res.json({
      success: true,
      departments,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/doctors
 * Register doctor profile
 */
doctorRouter.post(
  '/',
  requireAuth,
  requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const validated = doctorSchema.parse(req.body);

      // Create user account for doctor if not already linked
      let userId = validated.userId;
      if (!userId) {
        const user = await repository.createUser({
          username: validated.username,
          password: validated.password || 'DoctorPass123!',
          email: validated.email,
          fullName: validated.fullName,
          role: 'DOCTOR',
        });
        userId = user.id;
      }

      const doctor = await repository.createDoctor({
        userId,
        slmcRegNo: validated.slmcRegNo,
        specialization: validated.specialization,
        qualification: validated.qualification,
        consultationFee: validated.consultationFee,
        departmentId: validated.departmentId,
        roomNumber: validated.roomNumber,
        availableDays: validated.availableDays,
        morningSlotStart: validated.morningSlotStart,
        morningSlotEnd: validated.morningSlotEnd,
        eveningSlotStart: validated.eveningSlotStart,
        eveningSlotEnd: validated.eveningSlotEnd,
        maxPatientsPerSlot: validated.maxPatientsPerSlot,
      });

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'REGISTER_DOCTOR',
        entityName: 'Doctor',
        entityId: doctor.id,
        detailsJson: JSON.stringify({ slmcRegNo: doctor.slmcRegNo, name: validated.fullName }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        message: `Doctor ${validated.fullName} registered successfully.`,
        doctor,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/doctors/:id
 * Delete doctor profile
 */
doctorRouter.delete(
  '/:id',
  requireAuth,
  requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const success = await repository.deleteDoctor(req.params.id);
      if (!success) {
        res.status(404).json({ success: false, message: 'Doctor not found.' });
        return;
      }

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'DELETE_DOCTOR',
        entityName: 'Doctor',
        entityId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Doctor removed successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
);
