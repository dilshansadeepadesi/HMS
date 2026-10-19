import { Router, Response } from 'express';
import { repository } from '../db/repository';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { formatLKR } from '../utils/srilanka';

export const dashboardRouter = Router();

/**
 * GET /api/dashboard/stats
 * Aggregates core hospital performance metrics with role-specific views
 */
dashboardRouter.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const rawMetrics = await repository.getDashboardMetrics();

    // User's role determines which cards to highlight
    const userRole = req.user!.role;

    res.json({
      success: true,
      metrics: {
        totalPatients: rawMetrics.totalPatients,
        todayAppointments: rawMetrics.todayAppointments,
        upcomingAppointments: rawMetrics.upcomingAppointments,
        totalRevenueLKR: rawMetrics.totalRevenueLKR,
        totalRevenueFormatted: formatLKR(rawMetrics.totalRevenueLKR),
        pendingInvoicesLKR: rawMetrics.pendingInvoicesLKR,
        pendingInvoicesFormatted: formatLKR(rawMetrics.pendingInvoicesLKR),
        pendingLabRequests: rawMetrics.pendingLabRequests,
        lowStockCount: rawMetrics.lowStockCount,
        expiringCount: rawMetrics.expiringCount,
        activeAdmissions: rawMetrics.activeAdmissions,
        lowStockMedicines: rawMetrics.lowStockMedicines,
        expiringBatches: rawMetrics.expiringBatches,
        recentActivities: rawMetrics.recentActivities,
      },
      userRole,
    });
  } catch (err) {
    next(err);
  }
});
