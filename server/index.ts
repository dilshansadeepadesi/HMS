import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config';
import { applySecurityHeaders, errorHandler } from './middleware/security';
import { authenticate } from './middleware/auth';

// Route handlers
import { authRouter } from './routes/auth.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { patientRouter } from './routes/patient.routes';
import { doctorRouter } from './routes/doctor.routes';
import { appointmentRouter } from './routes/appointment.routes';
import { emrRouter } from './routes/emr.routes';
import { labRouter } from './routes/lab.routes';
import { pharmacyRouter } from './routes/pharmacy.routes';
import { billingRouter } from './routes/billing.routes';
import { inpatientRouter } from './routes/inpatient.routes';
import { staffRouter } from './routes/staff.routes';
import { reportRouter } from './routes/report.routes';
import { adminRouter } from './routes/admin.routes';

export const app = express();

// Security & Parsing Middlewares
app.use(applySecurityHeaders);
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '5mb' })); // Support logo uploads within 2MB
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// Session Authentication extraction
app.use(authenticate);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'MediPlus Hospital Management System',
    region: 'Sri Lanka (Asia/Colombo)',
    timestamp: new Date().toISOString(),
  });
});

// Modular API Endpoints
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/patients', patientRouter);
app.use('/api/doctors', doctorRouter);
app.use('/api/appointments', appointmentRouter);
app.use('/api/emr', emrRouter);
app.use('/api/lab', labRouter);
app.use('/api/pharmacy', pharmacyRouter);
app.use('/api/billing', billingRouter);
app.use('/api/inpatient', inpatientRouter);
app.use('/api/staff', staffRouter);
app.use('/api/reports', reportRouter);
app.use('/api/admin', adminRouter);

// Serve static frontend files if built
const distPath = path.resolve(import.meta.dirname, '../dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA routing in non-API requests
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('MediPlus Hospital Management System API is running.');
    }
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server if not running in serverless / test mode
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(` MediPlus HMS Server running on port ${config.port}`);
    console.log(` Locale: ${config.locale} | Timezone: ${config.timezone} | Currency: ${config.currency}`);
    console.log(` Health check: http://localhost:${config.port}/api/health`);
    console.log(`====================================================`);
  });
}

export default app;
