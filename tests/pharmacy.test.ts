import { describe, it, expect, beforeAll } from 'vitest';
import { repository } from '../server/db/repository';

describe('Pharmacy Inventory & Expiry Control', () => {
  beforeAll(async () => {
    await repository.init();
  });

  it('should list formulary medicines with stock and batch counts', async () => {
    const medicines = await repository.listMedicines();
    expect(medicines.length).toBeGreaterThan(0);
    const panadol = medicines.find((m) => m.code === 'MED-PCM-500');
    expect(panadol).toBeDefined();
    expect(panadol?.brandName).toBe('Panadol');
    expect(panadol?.unitPrice).toBe(5.50);
  });

  it('should flag low-stock medicines when stock <= reorderLevel', async () => {
    const medicines = await repository.listMedicines();
    // Amoxil has currentStock 120 and reorderLevel 200 in seed data
    const amoxil = medicines.find((m) => m.code === 'MED-AMX-500');
    expect(amoxil).toBeDefined();
    expect(amoxil?.isLowStock).toBe(true);
  });

  it('should reject dispensing from an expired batch', async () => {
    // 1. Add an expired batch to test
    const expiredBatch = await repository.addMedicineBatch({
      medicineId: 'med-01',
      batchNumber: 'TEST-EXP-001',
      manufacturingDate: '2020-01-01',
      expiryDate: '2021-01-01', // Expired!
      purchaseQuantity: 100,
      purchasePrice: 4.0,
      sellingPrice: 6.0,
    }, 'usr-admin-01');

    // 2. Create a fresh PENDING prescription
    await repository.createMedicalRecord({
      patientId: 'pat-01',
      doctorId: 'doc-01',
      chiefComplaint: 'Test fever for prescription test',
      diagnosis: 'Test diagnosis',
      prescriptions: [{
        medicineId: 'med-01',
        dosage: '500mg',
        frequency: 'TDS',
        durationDays: 2,
        quantityPrescribed: 6,
      }],
    });

    const presList = await repository.listPrescriptions();
    const pendingRx = presList.find((p) => p.status === 'PENDING')!;

    await expect(
      repository.dispensePrescription(
        pendingRx.id,
        [{
          prescriptionItemId: pendingRx.items[0].id,
          medicineId: 'med-01',
          batchId: expiredBatch.id,
          quantityToDispense: 5,
        }],
        'usr-pharm-01'
      )
    ).rejects.toThrow(/expired/);
  });

  it('should reject dispensing when quantity exceeds batch current stock', async () => {
    const medicines = await repository.listMedicines();
    const panadol = medicines.find((m) => m.code === 'MED-PCM-500');
    const validBatch = panadol.batches.find((b: any) => new Date(b.expiryDate).getTime() > Date.now());

    // Create another fresh PENDING prescription
    await repository.createMedicalRecord({
      patientId: 'pat-02',
      doctorId: 'doc-01',
      chiefComplaint: 'Stock test',
      diagnosis: 'Stock test',
      prescriptions: [{
        medicineId: 'med-01',
        dosage: '500mg',
        frequency: 'TDS',
        durationDays: 2,
        quantityPrescribed: 6,
      }],
    });

    const presList = await repository.listPrescriptions();
    const pendingRx = presList.find((p) => p.status === 'PENDING')!;

    await expect(
      repository.dispensePrescription(
        pendingRx.id,
        [{
          prescriptionItemId: pendingRx.items[0].id,
          medicineId: 'med-01',
          batchId: validBatch.id,
          quantityToDispense: 9999999, // Exceeds available stock
        }],
        'usr-pharm-01'
      )
    ).rejects.toThrow(/Insufficient stock/);
  });
});
