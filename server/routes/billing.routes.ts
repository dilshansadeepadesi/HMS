import { Router, Response } from 'express';
import { repository } from '../db/repository';
import { invoiceSchema, paymentSchema } from '../utils/validators';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { formatLKR } from '../utils/srilanka';

export const billingRouter = Router();

/**
 * GET /api/billing/invoices
 */
billingRouter.get(
  '/invoices',
  requireAuth,
  requireRoles(['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const invoices = await repository.listInvoices();
      res.json({
        success: true,
        invoices: invoices.map((inv) => ({
          ...inv,
          totalAmountFormatted: formatLKR(inv.totalAmount),
          netAmountFormatted: formatLKR(inv.netAmount),
          paidAmountFormatted: formatLKR(inv.paidAmount),
          balanceAmountFormatted: formatLKR(inv.balanceAmount),
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/billing/invoices/:id
 */
billingRouter.get(
  '/invoices/:id',
  requireAuth,
  requireRoles(['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const invoice = await repository.findInvoiceById(req.params.id);
      if (!invoice) {
        res.status(404).json({ success: false, message: 'Invoice not found.' });
        return;
      }

      res.json({
        success: true,
        invoice: {
          ...invoice,
          totalAmountFormatted: formatLKR(invoice.totalAmount),
          netAmountFormatted: formatLKR(invoice.netAmount),
          paidAmountFormatted: formatLKR(invoice.paidAmount),
          balanceAmountFormatted: formatLKR(invoice.balanceAmount),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/billing/invoices
 * Server-side validated invoice generation
 */
billingRouter.post(
  '/invoices',
  requireAuth,
  requireRoles(['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const validated = invoiceSchema.parse(req.body);

      const newInvoice = await repository.createInvoice(validated, req.user!.userId);

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'GENERATE_INVOICE',
        entityName: 'Invoice',
        entityId: newInvoice.id,
        detailsJson: JSON.stringify({
          invoiceNumber: newInvoice.invoiceNumber,
          netAmount: newInvoice.netAmount,
          patientId: newInvoice.patientId,
        }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        message: `Invoice ${newInvoice.invoiceNumber} generated for ${formatLKR(newInvoice.netAmount)}.`,
        invoice: newInvoice,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/billing/payments
 * Collect payment, generate official receipt, update invoice balance
 */
billingRouter.post(
  '/payments',
  requireAuth,
  requireRoles(['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const validated = paymentSchema.parse(req.body);

      const result = await repository.recordPayment(validated.invoiceId, validated, req.user!.userId);

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'RECORD_PAYMENT',
        entityName: 'Payment',
        entityId: result.payment.id,
        detailsJson: JSON.stringify({
          receiptNumber: result.payment.receiptNumber,
          amount: result.payment.amount,
          method: result.payment.paymentMethod,
        }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        message: `Payment of ${formatLKR(result.payment.amount)} recorded. Receipt #${result.payment.receiptNumber} issued.`,
        payment: result.payment,
        invoice: result.invoice,
      });
    } catch (err: any) {
      if (err.message && (err.message.includes('cannot exceed') || err.message.includes('not found'))) {
        res.status(400).json({ success: false, message: err.message });
        return;
      }
      next(err);
    }
  }
);
