import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../server/index';
import { repository } from '../server/db/repository';
import { signSessionToken } from '../server/utils/token';

describe('MediPlus API Endpoints & RBAC Security', () => {
  let adminToken: string;
  let receptionistToken: string;
  let doctorToken: string;
  let pharmacistToken: string;

  beforeAll(async () => {
    await repository.init();

    adminToken = signSessionToken({
      userId: 'usr-admin-01',
      username: 'admin',
      role: 'ADMIN',
      fullName: 'Admin User',
    });

    receptionistToken = signSessionToken({
      userId: 'usr-rec-01',
      username: 'rec.kasun',
      role: 'RECEPTIONIST',
      fullName: 'Kasun Fernando',
    });

    doctorToken = signSessionToken({
      userId: 'usr-doc-01',
      username: 'dr.perera',
      role: 'DOCTOR',
      fullName: 'Dr. Nihal Perera',
    });

    pharmacistToken = signSessionToken({
      userId: 'usr-pharm-01',
      username: 'pharm.malsha',
      role: 'PHARMACIST',
      fullName: 'Malsha Wickramasinghe',
    });
  });

  describe('Health Check', () => {
    it('GET /api/health returns 200 with healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.region).toContain('Sri Lanka');
    });
  });

  describe('Authentication & Protection', () => {
    it('POST /api/auth/login with wrong credentials returns 401 with generic message', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'InvalidPassword123!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid username or password');
    });

    it('GET /api/auth/me without token returns 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('GET /api/auth/me with valid token returns user', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('admin');
      expect(res.body.user.role).toBe('ADMIN');
    });
  });

  describe('RBAC Authorization', () => {
    it('Receptionist cannot access system admin users endpoint (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('Admin can access system admin users endpoint', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
    });
  });

  describe('Patients & Appointments', () => {
    it('GET /api/patients returns patient records', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].patientId).toMatch(/^MP-2026-/);
    });

    it('POST /api/appointments rejects duplicate booking conflict (409 Conflict)', async () => {
      // Slot 09:00 AM on today for doc-01 is already booked in seed data
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patientId: 'pat-02',
          doctorId: 'doc-01',
          departmentId: 'dept-gen-med',
          appointmentDate: todayStr,
          slotTime: '09:00 AM', // Conflict!
          type: 'CONSULTATION',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already booked');
    });
  });

  describe('Billing & Financial Calculations', () => {
    it('POST /api/billing/invoices calculates netAmount accurately server-side in LKR', async () => {
      const res = await request(app)
        .post('/api/billing/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-02',
          items: [
            { itemType: 'CONSULTATION', description: 'Consultation Fee', quantity: 1, unitPrice: 2500 },
            { itemType: 'LAB_TEST', description: 'FBC Investigation', quantity: 2, unitPrice: 950 },
          ],
          discountAmount: 400,
          taxAmount: 0,
        });

      expect(res.status).toBe(201);
      // 2500 + 2*950 = 4400. 4400 - 400 = 4000
      expect(res.body.invoice.totalAmount).toBe(4400);
      expect(res.body.invoice.netAmount).toBe(4000);
      expect(res.body.invoice.balanceAmount).toBe(4000);
    });
  });
});
