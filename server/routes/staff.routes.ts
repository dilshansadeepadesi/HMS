import { Router, Response } from 'express';
import { repository } from '../db/repository';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { formatLKR } from '../utils/srilanka';

export const staffRouter = Router();

/**
 * GET /api/staff/employees
 */
staffRouter.get(
  '/employees',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const employees = await repository.listEmployees();
      res.json({
        success: true,
        employees: employees.map((e) => ({
          ...e,
          salaryFormatted: req.user!.role === 'ADMIN' || req.user!.role === 'ACCOUNTANT' ? formatLKR(e.salaryLkr) : 'Restricted',
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/staff/employees
 * Add staff member
 */
staffRouter.post(
  '/employees',
  requireAuth,
  requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { fullName, nic, designation, departmentId, salaryLkr, phone, email, employmentType } = req.body;
      if (!fullName || !nic || !designation || !departmentId) {
        res.status(400).json({ success: false, message: 'Name, NIC, designation, and department are required.' });
        return;
      }

      const newEmp = await repository.createEmployee({
        fullName,
        nic,
        designation,
        departmentId,
        salaryLkr: parseFloat(salaryLkr) || 50000,
        phone: phone || '',
        email: email || '',
        employmentType: employmentType || 'PERMANENT',
      });

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'ADD_EMPLOYEE',
        entityName: 'Employee',
        entityId: newEmp.id,
        detailsJson: JSON.stringify({ fullName, designation }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        message: 'Staff member added successfully.',
        employee: newEmp,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/staff/employees/:id
 * Edit staff member
 */
staffRouter.put(
  '/employees/:id',
  requireAuth,
  requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const updates = req.body;
      const updated = await repository.updateEmployee(req.params.id, updates);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Employee not found.' });
        return;
      }

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'UPDATE_EMPLOYEE',
        entityName: 'Employee',
        entityId: req.params.id,
        detailsJson: JSON.stringify(updates),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Employee updated successfully.',
        employee: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/staff/employees/:id
 * Delete staff member
 */
staffRouter.delete(
  '/employees/:id',
  requireAuth,
  requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const success = await repository.deleteEmployee(req.params.id);
      if (!success) {
        res.status(404).json({ success: false, message: 'Employee not found.' });
        return;
      }

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'DELETE_EMPLOYEE',
        entityName: 'Employee',
        entityId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Staff member removed successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/staff/tasks
 * List assigned duties / tasks
 */
staffRouter.get('/tasks', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const employeeId = req.query.employeeId as string | undefined;
    const tasks = await repository.listStaffTasks(employeeId);
    res.json({
      success: true,
      tasks,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/staff/tasks
 * Assign task to staff member
 */
staffRouter.post(
  '/tasks',
  requireAuth,
  requireRoles(['ADMIN', 'DOCTOR', 'NURSE']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { employeeId, title, description, priority, shift, dueDate } = req.body;
      if (!employeeId || !title) {
        res.status(400).json({ success: false, message: 'Staff member and task title are required.' });
        return;
      }

      const task = await repository.createStaffTask(
        { employeeId, title, description, priority, shift, dueDate },
        req.user!.userId
      );

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'ASSIGN_STAFF_TASK',
        entityName: 'StaffTask',
        entityId: task.id,
        detailsJson: JSON.stringify({ employeeId, title, priority }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        message: 'Task assigned successfully.',
        task,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/staff/tasks/:id
 * Update task status
 */
staffRouter.patch('/tasks/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const updates = req.body;
    const updated = await repository.updateStaffTask(req.params.id, updates);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Task not found.' });
      return;
    }

    res.json({
      success: true,
      message: 'Task status updated.',
      task: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/staff/tasks/:id
 */
staffRouter.delete(
  '/tasks/:id',
  requireAuth,
  requireRoles(['ADMIN', 'DOCTOR', 'NURSE']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const success = await repository.deleteStaffTask(req.params.id);
      if (!success) {
        res.status(404).json({ success: false, message: 'Task not found.' });
        return;
      }

      res.json({
        success: true,
        message: 'Task removed successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/staff/attendance
 */
staffRouter.get('/attendance', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const date = req.query.date as string | undefined;
    const attendance = await repository.listAttendance(date);
    res.json({
      success: true,
      attendance,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/staff/attendance
 * Staff punch-in / check-in record
 */
staffRouter.post('/attendance', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { employeeId, date, checkInTime, checkOutTime, status, notes } = req.body;
    if (!employeeId || !date) {
      res.status(400).json({ success: false, message: 'Employee ID and date are required.' });
      return;
    }

    const record = await repository.markAttendance({
      employeeId,
      date,
      checkInTime,
      checkOutTime,
      status: status || 'PRESENT',
      notes,
    });

    res.json({
      success: true,
      message: 'Attendance record saved.',
      attendance: record,
    });
  } catch (err) {
    next(err);
  }
});
