import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '5000', 10),
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mediplus_db?schema=public',

  // JWT & Sessions
  jwtSecret: process.env.JWT_SECRET || 'mediplus-super-secret-jwt-key-2026-sri-lanka-secure-32chars',
  sessionExpiry: process.env.SESSION_EXPIRY || '8h',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  rateLimitMaxAttempts: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || '10', 10),

  // Sri Lankan Localization
  locale: process.env.DEFAULT_LOCALE || 'en-LK',
  timezone: process.env.DEFAULT_TIMEZONE || 'Asia/Colombo',
  currency: process.env.DEFAULT_CURRENCY || 'LKR',

  // Hospital Details
  hospital: {
    name: process.env.HOSPITAL_NAME || 'MediPlus Hospital & Healthcare Center',
    regNo: process.env.HOSPITAL_REG_NO || 'PV-LK-2026/0491',
    address: process.env.HOSPITAL_ADDRESS || '124/B Galle Road, Colombo 03, Sri Lanka',
    phone: process.env.HOSPITAL_PHONE || '+94 11 234 5678',
    email: process.env.HOSPITAL_EMAIL || 'care@mediplus.lk',
  },

  // Demo Environment
  demo: {
    adminUsername: process.env.DEMO_ADMIN_USERNAME || 'admin',
    adminPassword: process.env.DEMO_ADMIN_PASSWORD || 'DemoAdminPassword123!',
  },
};
