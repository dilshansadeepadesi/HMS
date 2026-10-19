import { repository } from './repository';
import { prisma, testDatabaseConnection } from './prisma';
import { config } from '../config';
import { hashPassword } from '../utils/password';
import {
  DEMO_USERS,
  DEMO_DEPARTMENTS,
  DEMO_DOCTORS,
  DEMO_PATIENTS,
  DEMO_MEDICINES,
  DEMO_BATCHES,
  DEMO_LAB_TESTS,
  DEMO_WARDS,
  DEMO_BEDS,
  DEMO_SETTINGS,
} from './seed-data';

async function seed() {
  console.log('----------------------------------------------------');
  console.log('MediPlus Hospital Management System — Database Seeder');
  console.log('Sri Lankan Localization & Role-Based Access Control');
  console.log('----------------------------------------------------');

  if (config.isProduction && process.env.ALLOW_PROD_SEED !== 'true') {
    console.error('CRITICAL: Seeding is disabled in production to protect patient data.');
    console.error('To override in a dedicated staging environment, set ALLOW_PROD_SEED=true.');
    process.exit(1);
  }

  const isPostgresLive = await testDatabaseConnection();

  if (isPostgresLive) {
    console.log('Connecting to managed PostgreSQL database...');
    // Seed PostgreSQL using Prisma transactions
    const defaultPasswordHash = await hashPassword('MediPlus@2026!');
    const adminPasswordHash = await hashPassword(config.demo.adminPassword);

    await prisma.$transaction(async (tx) => {
      // 1. Departments
      for (const d of DEMO_DEPARTMENTS) {
        await tx.department.upsert({
          where: { code: d.code },
          update: {},
          create: {
            id: d.id,
            name: d.name,
            code: d.code,
            description: d.description,
            isActive: d.isActive,
          },
        });
      }

      // 2. Users
      for (const u of DEMO_USERS) {
        const hash = u.role === 'ADMIN' ? adminPasswordHash : defaultPasswordHash;
        await tx.user.upsert({
          where: { username: u.username },
          update: { fullName: u.fullName, role: u.role as any, phone: u.phone },
          create: {
            id: u.id,
            username: u.username,
            email: u.email,
            fullName: u.fullName,
            passwordHash: hash,
            role: u.role as any,
            phone: u.phone,
          },
        });
      }

      // 3. Doctors
      for (const doc of DEMO_DOCTORS) {
        await tx.doctor.upsert({
          where: { slmcRegNo: doc.slmcRegNo },
          update: {},
          create: {
            id: doc.id,
            userId: doc.userId,
            slmcRegNo: doc.slmcRegNo,
            specialization: doc.specialization,
            qualification: doc.qualification,
            consultationFee: doc.consultationFee,
            departmentId: doc.departmentId,
            roomNumber: doc.roomNumber,
            availableDays: doc.availableDays,
          },
        });
      }

      // 4. Patients
      for (const p of DEMO_PATIENTS) {
        await tx.patient.upsert({
          where: { patientId: p.patientId },
          update: {},
          create: {
            id: p.id,
            patientId: p.patientId,
            fullName: p.fullName,
            nic: p.nic,
            passport: p.passport,
            dateOfBirth: new Date(p.dateOfBirth),
            gender: p.gender as any,
            bloodGroup: p.bloodGroup,
            phone: p.phone,
            email: p.email,
            address: p.address,
            province: p.province,
            district: p.district,
            postalCode: p.postalCode,
            emergencyContactName: p.emergencyContactName,
            emergencyContactPhone: p.emergencyContactPhone,
            emergencyContactRelation: p.emergencyContactRelation,
            allergies: p.allergies,
            medicalAlerts: p.medicalAlerts,
          },
        });
      }

      // 5. Medicines
      for (const m of DEMO_MEDICINES) {
        await tx.medicine.upsert({
          where: { code: m.code },
          update: {},
          create: {
            id: m.id,
            code: m.code,
            brandName: m.brandName,
            genericName: m.genericName,
            category: m.category,
            dosageForm: m.dosageForm,
            strength: m.strength,
            unit: m.unit,
            unitPrice: m.unitPrice,
            reorderLevel: m.reorderLevel,
            currentStock: m.currentStock,
            manufacturer: m.manufacturer,
          },
        });
      }

      // 6. Batches
      for (const b of DEMO_BATCHES) {
        await tx.medicineBatch.upsert({
          where: { id: b.id },
          update: {},
          create: {
            id: b.id,
            medicineId: b.medicineId,
            batchNumber: b.batchNumber,
            manufacturingDate: new Date(b.manufacturingDate),
            expiryDate: new Date(b.expiryDate),
            purchaseQuantity: b.purchaseQuantity,
            currentQuantity: b.currentQuantity,
            purchasePrice: b.purchasePrice,
            sellingPrice: b.sellingPrice,
            supplier: b.supplier,
          },
        });
      }

      // 7. Lab Tests
      for (const t of DEMO_LAB_TESTS) {
        await tx.laboratoryTest.upsert({
          where: { code: t.code },
          update: {},
          create: {
            id: t.id,
            code: t.code,
            name: t.name,
            category: t.category,
            description: t.description,
            price: t.price,
            turnaroundHours: t.turnaroundHours,
            sampleType: t.sampleType,
            referenceRangesJson: t.referenceRangesJson,
          },
        });
      }

      // 8. Wards & Beds
      for (const w of DEMO_WARDS) {
        await tx.ward.upsert({
          where: { code: w.code },
          update: {},
          create: {
            id: w.id,
            name: w.name,
            code: w.code,
            wardType: w.wardType as any,
            totalBeds: w.totalBeds,
            dailyRate: w.dailyRate,
          },
        });
      }

      for (const b of DEMO_BEDS) {
        await tx.bed.upsert({
          where: { id: b.id },
          update: {},
          create: {
            id: b.id,
            wardId: b.wardId,
            bedNumber: b.bedNumber,
            status: b.status as any,
          },
        });
      }

      // 9. Settings
      for (const s of DEMO_SETTINGS) {
        await tx.systemSetting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: {
            id: s.id,
            key: s.key,
            value: s.value,
            description: s.description,
          },
        });
      }
    });

    console.log('✓ PostgreSQL database successfully populated with MediPlus demo records.');
  } else {
    console.log('Initializing MediPlus repository store with demo dataset...');
    await repository.init();
    console.log('✓ Repository in-memory/isolated store populated with demo dataset.');
  }

  console.log('----------------------------------------------------');
  console.log('Demo Environment Ready:');
  console.log(`- Default Demo Admin Username: ${config.demo.adminUsername}`);
  console.log('- Password configured via DEMO_ADMIN_PASSWORD environment variable.');
  console.log('- Clinical, Laboratory, Pharmacy, Ward & Billing sample records active.');
  console.log('----------------------------------------------------');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
