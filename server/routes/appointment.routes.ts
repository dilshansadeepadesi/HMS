import { Router, Response } from 'express';
import { repository } from '../db/repository';
import { appointmentSchema } from '../utils/validators';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';

export const appointmentRouter = Router();

/**
 * GET /api/appointments
 */
appointmentRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const doctorId = req.query.doctorId as string | undefined;
    const date = req.query.date as string | undefined;
    const patientId = req.query.patientId as string | undefined;
    const status = req.query.status as string | undefined;

    const appointments = await repository.listAppointments({ doctorId, date, patientId, status });

    res.json({
      success: true,
      appointments,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/appointments
 * Book appointment with slot conflict prevention
 */
appointmentRouter.post(
  '/',
  requireAuth,
  requireRoles(['ADMIN', 'RECEPTIONIST', 'DOCTOR']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const validated = appointmentSchema.parse(req.body);

      const appointment = await repository.createAppointment({
        ...validated,
        bookedByUserId: req.user!.userId,
      });

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'BOOK_APPOINTMENT',
        entityName: 'Appointment',
        entityId: appointment.id,
        detailsJson: JSON.stringify({
          appointmentNumber: appointment.appointmentNumber,
          doctorId: appointment.doctorId,
          date: appointment.appointmentDate,
          slot: appointment.slotTime,
        }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        message: `Appointment ${appointment.appointmentNumber} scheduled successfully (Queue #${appointment.queueNumber}).`,
        appointment,
      });
    } catch (err: any) {
      if (err.message && err.message.includes('already booked')) {
        res.status(409).json({ success: false, message: err.message });
        return;
      }
      next(err);
    }
  }
);

/**
 * PATCH /api/appointments/:id/status
 */
appointmentRouter.patch(
  '/:id/status',
  requireAuth,
  requireRoles(['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { status } = req.body;
      const validStatuses = ['SCHEDULED', 'ARRIVED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid appointment status.' });
        return;
      }

      const updated = await repository.updateAppointmentStatus(req.params.id, status);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Appointment not found.' });
        return;
      }

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'UPDATE_APPOINTMENT_STATUS',
        entityName: 'Appointment',
        entityId: req.params.id,
        detailsJson: JSON.stringify({ newStatus: status }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: `Appointment status updated to ${status}.`,
        appointment: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/appointments/:id/cancel
 */
appointmentRouter.post(
  '/:id/cancel',
  requireAuth,
  requireRoles(['ADMIN', 'RECEPTIONIST', 'DOCTOR']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const reason = req.body.reason || 'Cancelled by staff/patient';
      const updated = await repository.updateAppointmentStatus(req.params.id, 'CANCELLED', reason);

      if (!updated) {
        res.status(404).json({ success: false, message: 'Appointment not found.' });
        return;
      }

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'CANCEL_APPOINTMENT',
        entityName: 'Appointment',
        entityId: req.params.id,
        detailsJson: JSON.stringify({ reason }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Appointment cancelled.',
        appointment: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/appointments/:id
 * Edit appointment details (reschedule slot, date, notes, type)
 */
appointmentRouter.put(
  '/:id',
  requireAuth,
  requireRoles(['ADMIN', 'RECEPTIONIST', 'DOCTOR']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const updates = req.body;
      const updated = await repository.updateAppointment(req.params.id, updates);

      if (!updated) {
        res.status(404).json({ success: false, message: 'Appointment not found.' });
        return;
      }

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'UPDATE_APPOINTMENT',
        entityName: 'Appointment',
        entityId: req.params.id,
        detailsJson: JSON.stringify(updates),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Appointment updated successfully.',
        appointment: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/appointments/:id
 * Delete appointment
 */
appointmentRouter.delete(
  '/:id',
  requireAuth,
  requireRoles(['ADMIN', 'RECEPTIONIST', 'DOCTOR']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const success = await repository.deleteAppointment(req.params.id);
      if (!success) {
        res.status(404).json({ success: false, message: 'Appointment not found.' });
        return;
      }

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'DELETE_APPOINTMENT',
        entityName: 'Appointment',
        entityId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Appointment deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
);
