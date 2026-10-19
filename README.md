# MediPlus — Secure Hospital Management System for Sri Lanka - 
# Host link : 
[https://mediplus-production-3304.up.railway.app/](https://mediplus-production-3304.up.railway.app/)
![MediPlus Header](public/logo.svg)

**MediPlus** is a production-grade, secure, and lightweight Hospital Management System (HMS) architected specifically for hospitals, medical centers, and clinical practices in **Sri Lanka**.

Built to meet the comprehensive functional requirements of the Sri Lankan healthcare system, MediPlus centralizes clinical records, appointments, pharmacy formulary, pathology laboratories, inpatient wards, staff attendance, and financial accounting with strict server-side Role-Based Access Control (RBAC).

---

## 1. System Architecture & Technology Stack

MediPlus is built on a clean multi-tier architecture with separation between presentation, API, business logic, validation, and data persistence layers:

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4.
- **Backend API:** Node.js, Express 5, TypeScript (compatible with Vercel Serverless Functions via `@vercel/node`).
- **Database:** PostgreSQL (with Prisma ORM v6.4, prepared for Neon, Supabase, or AWS RDS).
- **Authentication & Cryptography:** Bcrypt / Argon2id password hashing (work factor 12), JWT session tokens stored in secure, `HttpOnly`, `SameSite=lax` cookies.
- **Input Validation:** Strict type-safe schemas using Zod.
- **Testing:** Vitest automated test suite with Supertest API integration tests.
- **Client Optimization:** Tuned for low-specification computers (4–8 GB RAM), gzipped assets under 170 kB, debounced inputs, and lightweight components.

---

## 2. Sri Lankan Healthcare Localization

MediPlus comes pre-configured with native Sri Lankan healthcare standards:

1. **Currency (LKR):**
   - Every financial charge, doctor fee, prescription line, and invoice is denominated in **Sri Lankan Rupees (LKR)**.
   - Formatted using `en-LK` locale (e.g., `LKR 2,500.00`).
   - Server-side arithmetic to prevent floating-point discrepancies.

2. **National Identity Card (NIC) Validation:**
   - **Old Format:** 9 digits followed by `V` or `X` (e.g., `883412589V`, `915482390V`). Automatically verifies birth year and extracts gender (`days > 500` indicates female).
   - **New Format:** 12 digits (e.g., `199550341100`).
   - **Foreign Patients:** Support for international Passport numbers.

3. **Sri Lankan Telephone Numbers:**
   - Validates and normalizes Sri Lankan mobile numbers (Dialog `077`, Mobitel `071`, Airtel `075`, Hutch `078`, etc.) and landline area codes (Colombo `011`, Kandy `081`, Galle `091`).
   - Canonical format: `+94 XX XXX XXXX`.

4. **Administrative Divisions:**
   - Embedded database mapping of all **9 Provinces** (Western, Central, Southern, Northern, Eastern, North Western, North Central, Uva, Sabaragamuwa) and **25 Districts** (Colombo, Gampaha, Kalutara, Kandy, Galle, Matara, etc.).

5. **Hospital Terminology & Standards:**
   - Outpatient Department (OPD), Emergency Treatment Unit (ETU), Preliminary Care Unit (PCU).
   - Sri Lanka Medical Council (SLMC) registration number tracking for all doctors.
   - State Pharmaceuticals Corporation (SPC) and NMRA-aligned medicine formulary.
   - Timezone: `Asia/Colombo` (GMT+5:30) with real-time live clock ticker.
   - Date Format: `DD/MM/YYYY`.

---

## 3. Role-Based Access Control (RBAC) Matrix

MediPlus enforces least privilege on every server-side API endpoint:

| Functional Module | Administrator | Doctor | Nurse | Receptionist | Lab Staff | Pharmacist | Accountant |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Dashboard KPIs** | Full | Clinical | Clinical | Queue/Ops | Lab Stats | Drug Alerts | Financials |
| **Patient Registration** | ✓ | Read | Read | ✓ | Read | Read | Read |
| **Clinical Notes & EMR** | Read/Audit | ✓ (Create) | Read | ✗ | ✗ | ✗ | ✗ |
| **Doctor Appointments** | ✓ | ✓ | Status | ✓ (Book) | ✗ | ✗ | ✗ |
| **Prescription Ordering** | Read | ✓ (Create) | Read | ✗ | ✗ | Read | ✗ |
| **Prescription Dispensing**| Read | ✗ | ✗ | ✗ | ✗ | ✓ (Atomic) | ✗ |
| **Laboratory Ordering** | Read | ✓ (Order) | Read | ✗ | Read | ✗ | ✗ |
| **Lab Sample Collection** | Read | Read | ✓ | ✗ | ✓ | ✗ | ✗ |
| **Lab Result Verification**| Read | Verify | ✗ | ✗ | ✓ (Enter/Verify) | ✗ | ✗ |
| **Pharmacy Formulary** | ✓ | Read | Read | ✗ | ✗ | ✓ (Manage) | Read |
| **Invoicing & Cashier** | ✓ | ✗ | ✗ | ✓ (Create) | ✗ | ✗ | ✓ (Manage) |
| **Wards & Admissions** | ✓ | ✓ (Admit/Discharge)| ✓ (Status)| ✓ (Admit)| ✗ | ✗ | Read |
| **Staff & Attendance** | ✓ | ✗ | ✗ | Check-in | Check-in | Check-in | ✓ (Payroll) |
| **Audit Logs Viewer** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **System Branding / Logo** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

---

## 4. Security Hardening

- **Password Cryptography:** Passwords hashed with `bcryptjs` (salt rounds 12).
- **Brute-Force Rate Limiting:** Sliding-window rate limiter blocks repeated failed login attempts per IP.
- **Session Protection:** Session tokens stored in `HttpOnly`, `SameSite=lax` cookies with `Secure` flag enabled in production.
- **Anti-Clickjacking & Headers:** Content Security Policy (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security`.
- **Timing-Safe Authentication:** Timing-attack resistant credential verification prevents account enumeration.
- **Zero Raw Secrets in Bundles:** Database URLs and secrets are restricted exclusively to server-side environment variables.
- **Auditing:** Sensitive clinical, billing, dispensing, and administrative mutations are logged in an immutable audit trail with IP address and user agent.

---

## 5. Demo Evaluator Quick Login

During evaluation or staging, MediPlus includes a demo dataset populated with realistic Sri Lankan medical records.

| Role | Username | Default Password | Description |
|---|---|---|---|
| **System Administrator** | `admin` | `DemoAdminPassword123!` | Full system & user administration |
| **Consultant Physician** | `dr.perera` | `MediPlus@2026!` | Dr. Nihal Perera, MD, FRCP (SLMC-24810) |
| **Consultant Pediatrician**| `dr.silva` | `MediPlus@2026!` | Dr. Priyantha Silva, MBBS, DCH (SLMC-19342) |
| **Senior Staff Nurse** | `nurse.chamari` | `MediPlus@2026!` | Chamari Jayasinghe, RN |
| **Senior Receptionist** | `rec.kasun` | `MediPlus@2026!` | Kasun Fernando, Registration Counter |
| **Laboratory MLT** | `lab.dinuka` | `MediPlus@2026!` | Dinuka Rajapaksha, MLT Officer |
| **Chief Pharmacist** | `pharm.malsha` | `MediPlus@2026!` | Malsha Wickramasinghe, B.Pharm |
| **Hospital Accountant** | `acc.roshan` | `MediPlus@2026!` | Roshan De Silva, ACA |

> **Note for Evaluators:** The login screen contains a **"Demo Evaluator Quick Login"** panel. Clicking any role button automatically fills the credentials for instant evaluation.

---

## 6. Local Development Quickstart

### Prerequisites
- Node.js v18+ (tested on Node v20 & v24)
- npm v9+

### Setup Steps
```bash
# 1. Clone the repository
git clone https://github.com/your-org/mediplus.git
cd mediplus

# 2. Install dependencies
npm install

# 3. Create .env from template
cp .env.example .env

# 4. Populate Demo Records
npm run seed

# 5. Run the Test Suite
npm test

# 6. Start the Development Server
npm run dev

# 7. Start the Vite Frontend Client (in a separate terminal)
npm run client
```

Open `http://localhost:5173` in your browser.

---

## 7. Vercel Serverless Deployment

MediPlus is designed for zero-maintenance serverless deployment on Vercel:

1. **Push to GitHub / GitLab:**
   Ensure `.env` is ignored by `.gitignore`.

2. **Import Project to Vercel:**
   - Framework Preset: **Vite**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Configure Environment Variables in Vercel Project Settings:**
   - `DATABASE_URL`: Your managed PostgreSQL connection URL (e.g. from Neon or Supabase with connection pooling).
   - `JWT_SECRET`: Random 32+ character secret string (`openssl rand -base64 32`).
   - `NODE_ENV`: `production`
   - `COOKIE_SECURE`: `true`
   - `DEFAULT_CURRENCY`: `LKR`
   - `DEFAULT_TIMEZONE`: `Asia/Colombo`
   - `DEFAULT_LOCALE`: `en-LK`
   - `HOSPITAL_NAME`: Your hospital name

4. **Deploy:**
   Click **Deploy**. Vercel will build the frontend assets into `dist` and deploy `api/index.ts` as a high-performance serverless function routing `/api/*`.

---

## 8. Database Migrations, Backup, and Disaster Recovery

### Managed PostgreSQL Configuration (Neon / Supabase)
In serverless environments, connect using a pooled connection string:
```env
DATABASE_URL="postgres://user:pass@ep-xyz.ap-southeast-1.aws.neon.tech/mediplus?sslmode=require&pgbouncer=true"
```

### Running Migrations
To apply the database schema to your PostgreSQL database:
```bash
npm run prisma:migrate
```
A complete DDL migration script is also saved at:
`prisma/migrations/0_init/migration.sql`

### Backup & Disaster Recovery Strategy
1. **Automated Point-in-Time Recovery (PITR):**
   - If using **Neon**: Neon provides continuous WAL archiving with 7-day to 30-day point-in-time recovery.
   - If using **Supabase**: Daily automated backups with 1-click restore.
2. **Scheduled Off-Site Backups:**
   ```bash
   pg_dump -h <host> -U <user> -d mediplus_db -F c -b -v -f "mediplus_backup_$(date +%Y%m%d).dump"
   ```
3. **Disaster Recovery Plan:**
   - Database restore drill can be executed by creating a test branch in Neon or restoring the latest dump file to a staging cluster:
   ```bash
   pg_restore -h <staging-host> -U <user> -d mediplus_staging "mediplus_backup_YYYYMMDD.dump"
   ```
   - Demo database is isolated from production, ensuring evaluation tests never impact live patient records.

---

## 9. Automated Test Suite

Run the Vitest test suite covering cryptographic hashing, RBAC permissions, Sri Lankan NIC validation, phone normalization, appointment conflicts, stock expiry control, and LKR financial accounting:

```bash
npm test
```

### Current Test Results:
```text
✓ tests/srilanka.test.ts (10 tests)
✓ tests/billing.test.ts  (4 tests)
✓ tests/pharmacy.test.ts (4 tests)
✓ tests/auth.test.ts     (3 tests)
✓ tests/api.test.ts      (9 tests)

Test Files  5 passed (5)
Tests       30 passed (30)
```

---

## 10. License & Compliance Notice

This software is designed to comply with privacy, confidentiality, and data protection principles applicable to healthcare providers in Sri Lanka. It does not replace clinical judgment by certified medical practitioners.
