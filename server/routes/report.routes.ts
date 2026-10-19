import { Router, Response } from 'express';
import { repository } from '../db/repository';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { formatLKR, formatSriLankanDate } from '../utils/srilanka';

export const reportRouter = Router();

/**
 * GET /api/reports/summary
 */
reportRouter.get(
  '/summary',
  requireAuth,
  requireRoles(['ADMIN', 'ACCOUNTANT', 'DOCTOR']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const metrics = await repository.getDashboardMetrics();
      const invoices = await repository.listInvoices();
      const patients = await repository.listPatients();
      const appointments = await repository.listAppointments();
      const medicines = await repository.listMedicines();

      res.json({
        success: true,
        summary: {
          metrics,
          totalInvoicesCount: invoices.length,
          totalPatientsCount: patients.total,
          totalAppointmentsCount: appointments.length,
          totalMedicinesCount: medicines.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/reports/export-csv
 * Generates downloadable CSV with permission validation
 */
reportRouter.get(
  '/export-csv',
  requireAuth,
  requireRoles(['ADMIN', 'ACCOUNTANT']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const type = req.query.type as string; // 'revenue' | 'patients' | 'pharmacy'

      let csvContent = '';
      let filename = `mediplus-report-${Date.now()}.csv`;

      if (type === 'revenue') {
        filename = `mediplus-revenue-${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = 'Invoice Number,Patient Name,Total Amount (LKR),Discount (LKR),Net Amount (LKR),Paid (LKR),Balance (LKR),Status,Created Date\n';
        const invoices = await repository.listInvoices();
        for (const inv of invoices) {
          csvContent += `"${inv.invoiceNumber}","${inv.patientName || ''}",${inv.totalAmount},${inv.discountAmount},${inv.netAmount},${inv.paidAmount},${inv.balanceAmount},"${inv.status}","${formatSriLankanDate(inv.createdAt)}"\n`;
        }
      } else if (type === 'pharmacy') {
        filename = `mediplus-inventory-${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = 'Code,Brand Name,Generic Name,Category,Dosage Form,Strength,Current Stock,Reorder Level,Unit Price (LKR)\n';
        const meds = await repository.listMedicines();
        for (const m of meds) {
          csvContent += `"${m.code}","${m.brandName}","${m.genericName}","${m.category}","${m.dosageForm}","${m.strength}",${m.currentStock},${m.reorderLevel},${m.unitPrice}\n`;
        }
      } else {
        filename = `mediplus-patients-${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = 'Patient ID,Full Name,NIC,Gender,Blood Group,Phone,Province,District,Registration Date\n';
        const { data: pats } = await repository.listPatients({ limit: 1000 });
        for (const p of pats) {
          csvContent += `"${p.patientId}","${p.fullName}","${p.nic || ''}","${p.gender}","${p.bloodGroup || ''}","${p.phone}","${p.province}","${p.district}","${formatSriLankanDate(p.createdAt)}"\n`;
        }
      }

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'EXPORT_REPORT_CSV',
        entityName: 'Report',
        detailsJson: JSON.stringify({ type, filename }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/reports/export-excel
 * Generates downloadable Excel (.xls) file with styled tables
 */
reportRouter.get(
  '/export-excel',
  requireAuth,
  requireRoles(['ADMIN', 'ACCOUNTANT']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const type = req.query.type as string; // 'revenue' | 'patients' | 'pharmacy'
      let filename = `mediplus-report-${Date.now()}.xls`;
      let title = 'Hospital Report';
      let tableHtml = '';

      if (type === 'revenue') {
        filename = `mediplus-revenue-${new Date().toISOString().split('T')[0]}.xls`;
        title = 'MediPlus Hospital — Revenue & Financial Ledger';
        const invoices = await repository.listInvoices();
        tableHtml = `
          <table border="1">
            <tr style="background-color: #0d9488; color: white; font-weight: bold;">
              <th>Invoice Number</th>
              <th>Patient Name</th>
              <th>Total Amount (LKR)</th>
              <th>Discount (LKR)</th>
              <th>Net Amount (LKR)</th>
              <th>Paid Amount (LKR)</th>
              <th>Balance Due (LKR)</th>
              <th>Status</th>
              <th>Created Date</th>
            </tr>
            ${invoices.map((inv) => `
              <tr>
                <td>${inv.invoiceNumber}</td>
                <td>${inv.patientName || ''}</td>
                <td>${inv.totalAmount}</td>
                <td>${inv.discountAmount}</td>
                <td>${inv.netAmount}</td>
                <td>${inv.paidAmount}</td>
                <td>${inv.balanceAmount}</td>
                <td>${inv.status}</td>
                <td>${formatSriLankanDate(inv.createdAt)}</td>
              </tr>
            `).join('')}
          </table>
        `;
      } else if (type === 'pharmacy') {
        filename = `mediplus-inventory-${new Date().toISOString().split('T')[0]}.xls`;
        title = 'MediPlus Hospital — Pharmacy & Formulary Stock';
        const meds = await repository.listMedicines();
        tableHtml = `
          <table border="1">
            <tr style="background-color: #0d9488; color: white; font-weight: bold;">
              <th>Code</th>
              <th>Brand Name</th>
              <th>Generic Name</th>
              <th>Category</th>
              <th>Dosage Form</th>
              <th>Strength</th>
              <th>Current Stock</th>
              <th>Reorder Level</th>
              <th>Unit Price (LKR)</th>
            </tr>
            ${meds.map((m) => `
              <tr>
                <td>${m.code}</td>
                <td>${m.brandName}</td>
                <td>${m.genericName}</td>
                <td>${m.category}</td>
                <td>${m.dosageForm}</td>
                <td>${m.strength}</td>
                <td>${m.currentStock}</td>
                <td>${m.reorderLevel}</td>
                <td>${m.unitPrice}</td>
              </tr>
            `).join('')}
          </table>
        `;
      } else {
        filename = `mediplus-patients-${new Date().toISOString().split('T')[0]}.xls`;
        title = 'MediPlus Hospital — Patient Registry & Demographics';
        const { data: pats } = await repository.listPatients({ limit: 1000 });
        tableHtml = `
          <table border="1">
            <tr style="background-color: #0d9488; color: white; font-weight: bold;">
              <th>Patient ID</th>
              <th>Full Name</th>
              <th>NIC / Passport</th>
              <th>Gender</th>
              <th>Blood Group</th>
              <th>Phone</th>
              <th>Province</th>
              <th>District</th>
              <th>Registration Date</th>
            </tr>
            ${pats.map((p) => `
              <tr>
                <td>${p.patientId}</td>
                <td>${p.fullName}</td>
                <td>${p.nic || p.passport || ''}</td>
                <td>${p.gender}</td>
                <td>${p.bloodGroup || ''}</td>
                <td>${p.phone}</td>
                <td>${p.province}</td>
                <td>${p.district}</td>
                <td>${formatSriLankanDate(p.createdAt)}</td>
              </tr>
            `).join('')}
          </table>
        `;
      }

      const excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <style>
            th, td { padding: 6px 12px; font-family: Arial, sans-serif; font-size: 12px; }
          </style>
        </head>
        <body>
          <h2>${title}</h2>
          <p>Export Date: ${new Date().toLocaleDateString('en-LK')}</p>
          ${tableHtml}
        </body>
        </html>
      `;

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'EXPORT_REPORT_EXCEL',
        entityName: 'Report',
        detailsJson: JSON.stringify({ type, filename }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(excelContent);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/reports/export-pdf
 * Generates printer/PDF-ready styled document with print trigger
 */
reportRouter.get(
  '/export-pdf',
  requireAuth,
  requireRoles(['ADMIN', 'ACCOUNTANT', 'DOCTOR']),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const type = req.query.type as string; // 'revenue' | 'patients' | 'pharmacy' | 'summary'
      let title = 'Hospital Executive Report';
      let tableHtml = '';

      if (type === 'revenue') {
        title = 'MediPlus Hospital — Revenue & Financial Ledger';
        const invoices = await repository.listInvoices();
        tableHtml = `
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Patient Name</th>
                <th>Total (LKR)</th>
                <th>Discount</th>
                <th>Net (LKR)</th>
                <th>Paid (LKR)</th>
                <th>Balance (LKR)</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.map((inv) => `
                <tr>
                  <td><strong>${inv.invoiceNumber}</strong></td>
                  <td>${inv.patientName || '-'}</td>
                  <td>${inv.totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                  <td>${inv.discountAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                  <td><strong>${inv.netAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong></td>
                  <td>${inv.paidAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                  <td style="color: ${inv.balanceAmount > 0 ? '#b91c1c' : '#15803d'}">${inv.balanceAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                  <td><span class="badge ${inv.status.toLowerCase()}">${inv.status}</span></td>
                  <td>${formatSriLankanDate(inv.createdAt)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else if (type === 'pharmacy') {
        title = 'MediPlus Hospital — Pharmacy Stock & Formulary Report';
        const meds = await repository.listMedicines();
        tableHtml = `
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Brand Name</th>
                <th>Generic Name</th>
                <th>Category</th>
                <th>Dosage / Form</th>
                <th>Current Stock</th>
                <th>Reorder Level</th>
                <th>Unit Price (LKR)</th>
              </tr>
            </thead>
            <tbody>
              ${meds.map((m) => `
                <tr>
                  <td><strong>${m.code}</strong></td>
                  <td>${m.brandName}</td>
                  <td>${m.genericName}</td>
                  <td>${m.category}</td>
                  <td>${m.dosageForm} ${m.strength}</td>
                  <td style="color: ${m.currentStock <= m.reorderLevel ? '#b91c1c' : '#0f172a'}; font-weight: bold;">${m.currentStock}</td>
                  <td>${m.reorderLevel}</td>
                  <td>${m.unitPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        title = 'MediPlus Hospital — Patient Registry & Demographics';
        const { data: pats } = await repository.listPatients({ limit: 1000 });
        tableHtml = `
          <table>
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Full Name</th>
                <th>NIC / Passport</th>
                <th>Gender / Blood</th>
                <th>Phone Number</th>
                <th>District / Province</th>
                <th>Registered Date</th>
              </tr>
            </thead>
            <tbody>
              ${pats.map((p) => `
                <tr>
                  <td><strong>${p.patientId}</strong></td>
                  <td>${p.fullName}</td>
                  <td>${p.nic || p.passport || '-'}</td>
                  <td>${p.gender} (${p.bloodGroup || 'N/A'})</td>
                  <td>${p.phone}</td>
                  <td>${p.district}, ${p.province}</td>
                  <td>${formatSriLankanDate(p.createdAt)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>${title} - MediPlus Sri Lanka</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 15px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 15px; }
            .hospital-name { font-size: 18px; font-weight: bold; color: #0f172a; }
            .sub-text { font-size: 10px; color: #64748b; margin-top: 2px; }
            .doc-title { font-size: 14px; font-weight: bold; color: #0d9488; margin-top: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10px; }
            th { background-color: #0f766e; color: #ffffff; text-align: left; padding: 6px 8px; font-weight: 600; }
            td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
            tr:nth-child(even) td { background-color: #f8fafc; }
            .badge { padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; }
            .badge.paid { background-color: #dcfce7; color: #15803d; }
            .badge.pending { background-color: #fef3c7; color: #b45309; }
            .badge.partially_paid { background-color: #e0e7ff; color: #4338ca; }
            .footer { margin-top: 25px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }
            @media print {
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="background: #f1f5f9; padding: 10px 15px; border-radius: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; color: #334155;">Report Print / PDF Generation Preview</span>
            <button onclick="window.print()" style="background: #0d9488; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-weight: bold; cursor: pointer;">
              🖨️ Print / Save as PDF
            </button>
          </div>
          <div class="header">
            <div>
              <div class="hospital-name">MediPlus Hospital & Healthcare Center</div>
              <div class="sub-text">Ministry of Health Reg: WP/COL/2026/894 • Colombo 03, Sri Lanka</div>
              <div class="sub-text">Tel: +94 11 234 5678 • Email: reports@mediplus.lk</div>
              <div class="doc-title">${title}</div>
            </div>
            <div style="text-align: right;">
              <div class="sub-text">Generated On: <strong>${new Date().toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}</strong></div>
              <div class="sub-text">Currency: <strong>LKR (Sri Lankan Rupees)</strong></div>
              <div class="sub-text">Generated By: <strong>${req.user!.username} (${req.user!.role})</strong></div>
            </div>
          </div>
          ${tableHtml}
          <div class="footer">
            <span>MediPlus Secure Electronic Healthcare Management System — Confidential Document</span>
            <span>Page 1 of 1</span>
          </div>
          <script>
            // Auto open print dialog if requested
            if (window.location.search.includes('auto=true')) {
              window.addEventListener('load', () => window.print());
            }
          </script>
        </body>
        </html>
      `;

      await repository.recordAudit({
        userId: req.user!.userId,
        username: req.user!.username,
        userRole: req.user!.role,
        action: 'EXPORT_REPORT_PDF',
        entityName: 'Report',
        detailsJson: JSON.stringify({ type }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      next(err);
    }
  }
);
