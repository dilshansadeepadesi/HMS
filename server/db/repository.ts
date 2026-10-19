import { hashPassword } from '../utils/password';
import { config } from '../config';
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
  DEMO_ADMISSIONS,
  DEMO_APPOINTMENTS,
  DEMO_MEDICAL_RECORDS,
  DEMO_PRESCRIPTIONS,
  DEMO_LAB_REQUESTS,
  DEMO_INVOICES,
  DEMO_EMPLOYEES,
  DEMO_ATTENDANCE,
  DEMO_AUDIT_LOGS,
  DEMO_SETTINGS,
} from './seed-data';

// Internal In-Memory Persistent Store
class MediPlusRepository {
  private users: any[] = [];
  private departments: any[] = [];
  private doctors: any[] = [];
  private patients: any[] = [];
  private medicines: any[] = [];
  private batches: any[] = [];
  private stockMovements: any[] = [];
  private labTests: any[] = [];
  private labRequests: any[] = [];
  private wards: any[] = [];
  private beds: any[] = [];
  private admissions: any[] = [];
  private appointments: any[] = [];
  private medicalRecords: any[] = [];
  private prescriptions: any[] = [];
  private invoices: any[] = [];
  private payments: any[] = [];
  private employees: any[] = [];
  private attendance: any[] = [];
  private leaveRecords: any[] = [];
  private auditLogs: any[] = [];
  private settings: Map<string, string> = new Map();
  private documents: any[] = [];
  private staffTasks: any[] = [];

  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;

    // Load settings
    for (const s of DEMO_SETTINGS) {
      this.settings.set(s.key, s.value);
    }

    // Hash demo user passwords
    const defaultPasswordHash = await hashPassword('MediPlus@2026!');
    const adminPasswordHash = await hashPassword(config.demo.adminPassword || 'DemoAdminPassword123!');

    this.users = DEMO_USERS.map((u) => ({
      ...u,
      passwordHash: u.role === 'ADMIN' ? adminPasswordHash : defaultPasswordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    this.departments = JSON.parse(JSON.stringify(DEMO_DEPARTMENTS));
    this.doctors = JSON.parse(JSON.stringify(DEMO_DOCTORS));
    this.patients = JSON.parse(JSON.stringify(DEMO_PATIENTS));
    this.medicines = JSON.parse(JSON.stringify(DEMO_MEDICINES));
    this.batches = JSON.parse(JSON.stringify(DEMO_BATCHES));
    this.labTests = JSON.parse(JSON.stringify(DEMO_LAB_TESTS));
    this.labRequests = JSON.parse(JSON.stringify(DEMO_LAB_REQUESTS));
    this.wards = JSON.parse(JSON.stringify(DEMO_WARDS));
    this.beds = JSON.parse(JSON.stringify(DEMO_BEDS));
    this.admissions = JSON.parse(JSON.stringify(DEMO_ADMISSIONS));
    this.appointments = JSON.parse(JSON.stringify(DEMO_APPOINTMENTS));
    this.medicalRecords = JSON.parse(JSON.stringify(DEMO_MEDICAL_RECORDS));
    this.prescriptions = JSON.parse(JSON.stringify(DEMO_PRESCRIPTIONS));
    this.invoices = JSON.parse(JSON.stringify(DEMO_INVOICES));
    this.employees = JSON.parse(JSON.stringify(DEMO_EMPLOYEES));
    this.attendance = JSON.parse(JSON.stringify(DEMO_ATTENDANCE));
    this.auditLogs = JSON.parse(JSON.stringify(DEMO_AUDIT_LOGS));

    // Extract payments from invoices
    this.payments = [];
    for (const inv of this.invoices) {
      if (inv.payments && inv.payments.length > 0) {
        this.payments.push(...inv.payments);
      }
    }

    this.staffTasks = [
      {
        id: 'task-01',
        employeeId: 'emp-01',
        title: 'Ward Round Medication Check',
        description: 'Verify morning medication carts and IV fluids in Male Medical Ward',
        priority: 'HIGH',
        shift: 'Morning (07:00 - 15:00)',
        dueDate: new Date().toISOString().split('T')[0],
        status: 'IN_PROGRESS',
        assignedByUserId: 'usr-admin-01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-02',
        employeeId: 'emp-02',
        title: 'OPD Queue Number Verification',
        description: 'Ensure outpatient queue numbers match registration counter tokens',
        priority: 'MEDIUM',
        shift: 'Morning Shift',
        dueDate: new Date().toISOString().split('T')[0],
        status: 'COMPLETED',
        assignedByUserId: 'usr-admin-01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-03',
        employeeId: 'emp-03',
        title: 'Biochemistry Analyzer Calibration',
        description: 'Daily QC run on lipid profile and glucose automated reagent kits',
        priority: 'HIGH',
        shift: 'Day Shift',
        dueDate: new Date().toISOString().split('T')[0],
        status: 'PENDING',
        assignedByUserId: 'usr-admin-01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    this.isInitialized = true;
  }

  // --- Users & Auth ---
  async findUserByUsername(username: string) {
    await this.init();
    const clean = username.trim().toLowerCase();
    return this.users.find((u) => u.username.toLowerCase() === clean && u.isActive) || null;
  }

  async findUserById(id: string) {
    await this.init();
    return this.users.find((u) => u.id === id) || null;
  }

  async listUsers() {
    await this.init();
    return this.users.map(({ passwordHash, ...safeUser }) => safeUser);
  }

  async createUser(userData: any) {
    await this.init();
    const id = `usr-${Date.now()}`;
    const hash = await hashPassword(userData.password);
    const newUser = {
      id,
      username: userData.username.trim(),
      email: userData.email.trim(),
      passwordHash: hash,
      fullName: userData.fullName,
      role: userData.role,
      phone: userData.phone || null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    const { passwordHash, ...safe } = newUser;
    return safe;
  }

  async updateUser(id: string, updates: any) {
    await this.init();
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    if (updates.password) {
      updates.passwordHash = await hashPassword(updates.password);
      delete updates.password;
    }
    this.users[index] = { ...this.users[index], ...updates, updatedAt: new Date().toISOString() };
    const { passwordHash, ...safe } = this.users[index];
    return safe;
  }

  // --- Patients ---
  async listPatients(options?: { search?: string; page?: number; limit?: number }) {
    await this.init();
    let result = [...this.patients];
    if (options?.search) {
      const q = options.search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.patientId.toLowerCase().includes(q) ||
          p.fullName.toLowerCase().includes(q) ||
          (p.nic && p.nic.toLowerCase().includes(q)) ||
          p.phone.includes(q)
      );
    }
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const total = result.length;
    const start = (page - 1) * limit;
    const data = result.slice(start, start + limit);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findPatientById(id: string) {
    await this.init();
    return this.patients.find((p) => p.id === id || p.patientId === id) || null;
  }

  async createPatient(patientData: any) {
    await this.init();
    // Unique ID generation: MP-2026-XXXX
    const nextNum = (this.patients.length + 1).toString().padStart(4, '0');
    const patientId = `MP-2026-${nextNum}`;
    const newPatient = {
      id: `pat-${Date.now()}`,
      patientId,
      ...patientData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.patients.unshift(newPatient);
    return newPatient;
  }

  async updatePatient(id: string, updates: any) {
    await this.init();
    const index = this.patients.findIndex((p) => p.id === id || p.patientId === id);
    if (index === -1) return null;
    this.patients[index] = { ...this.patients[index], ...updates, updatedAt: new Date().toISOString() };
    return this.patients[index];
  }

  async deletePatient(id: string) {
    await this.init();
    const index = this.patients.findIndex((p) => p.id === id || p.patientId === id);
    if (index === -1) return false;
    this.patients.splice(index, 1);
    return true;
  }

  // --- Doctors & Departments ---
  async listDepartments() {
    await this.init();
    return this.departments;
  }

  async listDoctors() {
    await this.init();
    return this.doctors.map((doc) => {
      const dept = this.departments.find((d) => d.id === doc.departmentId);
      const user = this.users.find((u) => u.id === doc.userId);
      return {
        ...doc,
        departmentName: dept?.name || 'General',
        fullName: user?.fullName || 'Dr. Specialist',
        email: user?.email,
        phone: user?.phone,
      };
    });
  }

  async findDoctorById(id: string) {
    await this.init();
    const doc = this.doctors.find((d) => d.id === id || d.userId === id);
    if (!doc) return null;
    const dept = this.departments.find((d) => d.id === doc.departmentId);
    const user = this.users.find((u) => u.id === doc.userId);
    return {
      ...doc,
      departmentName: dept?.name,
      fullName: user?.fullName,
      email: user?.email,
      phone: user?.phone,
    };
  }

  async createDoctor(docData: any) {
    await this.init();
    const newDoc = {
      id: `doc-${Date.now()}`,
      ...docData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.doctors.push(newDoc);
    return newDoc;
  }

  async deleteDoctor(id: string) {
    await this.init();
    const index = this.doctors.findIndex((d) => d.id === id);
    if (index === -1) return false;
    this.doctors.splice(index, 1);
    return true;
  }

  // --- Appointments ---
  async listAppointments(filter?: { doctorId?: string; date?: string; patientId?: string; status?: string }) {
    await this.init();
    let result = [...this.appointments];
    if (filter?.doctorId) result = result.filter((a) => a.doctorId === filter.doctorId);
    if (filter?.date) result = result.filter((a) => a.appointmentDate === filter.date);
    if (filter?.patientId) result = result.filter((a) => a.patientId === filter.patientId);
    if (filter?.status) result = result.filter((a) => a.status === filter.status);

    return result.map((apt) => {
      const pat = this.patients.find((p) => p.id === apt.patientId);
      const doc = this.doctors.find((d) => d.id === apt.doctorId);
      const userDoc = doc ? this.users.find((u) => u.id === doc.userId) : null;
      const dept = this.departments.find((d) => d.id === apt.departmentId);
      return {
        ...apt,
        patientName: pat?.fullName || 'Patient',
        patientIdNumber: pat?.patientId,
        doctorName: userDoc?.fullName || 'Doctor',
        departmentName: dept?.name || 'OPD',
      };
    });
  }

  async findAppointmentById(id: string) {
    await this.init();
    return this.appointments.find((a) => a.id === id || a.appointmentNumber === id) || null;
  }

  async createAppointment(data: any) {
    await this.init();
    // Prevent double booking at the same slot
    const conflict = this.appointments.find(
      (a) =>
        a.doctorId === data.doctorId &&
        a.appointmentDate === data.appointmentDate &&
        a.slotTime === data.slotTime &&
        a.status !== 'CANCELLED'
    );
    if (conflict) {
      throw new Error(`Time slot ${data.slotTime} on ${data.appointmentDate} is already booked for this doctor.`);
    }

    const nextQueue = this.appointments.filter(
      (a) => a.doctorId === data.doctorId && a.appointmentDate === data.appointmentDate
    ).length + 1;

    const aptNumber = `APT-2026-${(this.appointments.length + 1).toString().padStart(4, '0')}`;
    const newApt = {
      id: `apt-${Date.now()}`,
      appointmentNumber: aptNumber,
      queueNumber: nextQueue,
      status: 'SCHEDULED',
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.appointments.push(newApt);
    return newApt;
  }

  async updateAppointmentStatus(id: string, status: string, cancellationReason?: string) {
    await this.init();
    const index = this.appointments.findIndex((a) => a.id === id);
    if (index === -1) return null;
    this.appointments[index].status = status;
    if (cancellationReason) {
      this.appointments[index].cancellationReason = cancellationReason;
    }
    this.appointments[index].updatedAt = new Date().toISOString();
    return this.appointments[index];
  }

  async updateAppointment(id: string, updates: any) {
    await this.init();
    const index = this.appointments.findIndex((a) => a.id === id);
    if (index === -1) return null;
    this.appointments[index] = {
      ...this.appointments[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.appointments[index];
  }

  async deleteAppointment(id: string) {
    await this.init();
    const index = this.appointments.findIndex((a) => a.id === id);
    if (index === -1) return false;
    this.appointments.splice(index, 1);
    return true;
  }

  // --- EMR & Medical Records ---
  async listMedicalRecords(patientId?: string) {
    await this.init();
    let records = [...this.medicalRecords];
    if (patientId) {
      records = records.filter((r) => r.patientId === patientId);
    }
    return records.map((r) => {
      const pat = this.patients.find((p) => p.id === r.patientId);
      const doc = this.doctors.find((d) => d.id === r.doctorId);
      const userDoc = doc ? this.users.find((u) => u.id === doc.userId) : null;
      const prescriptions = this.prescriptions.filter((rx) => rx.medicalRecordId === r.id);
      return {
        ...r,
        patientName: pat?.fullName,
        patientIdNumber: pat?.patientId,
        doctorName: userDoc?.fullName,
        doctorSlmc: doc?.slmcRegNo,
        prescriptions,
      };
    });
  }

  async createMedicalRecord(data: any) {
    await this.init();
    const recordId = `mr-${Date.now()}`;
    const { prescriptions, ...recordFields } = data;
    const newRecord = {
      id: recordId,
      ...recordFields,
      visitDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.medicalRecords.unshift(newRecord);

    // If prescription items are attached, create the prescription record
    if (prescriptions && prescriptions.length > 0) {
      const rxNumber = `RX-2026-${(this.prescriptions.length + 1).toString().padStart(4, '0')}`;
      const newRx = {
        id: `rx-${Date.now()}`,
        prescriptionNo: rxNumber,
        medicalRecordId: recordId,
        patientId: data.patientId,
        doctorId: data.doctorId,
        status: 'PENDING',
        notes: data.treatmentPlan || '',
        items: prescriptions.map((item: any, idx: number) => ({
          id: `rxi-${Date.now()}-${idx}`,
          ...item,
          quantityDispensed: 0,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.prescriptions.unshift(newRx);
    }

    return newRecord;
  }

  // --- Prescriptions ---
  async listPrescriptions(filter?: { patientId?: string; status?: string }) {
    await this.init();
    let list = [...this.prescriptions];
    if (filter?.patientId) list = list.filter((p) => p.patientId === filter.patientId);
    if (filter?.status) list = list.filter((p) => p.status === filter.status);

    return list.map((rx) => {
      const pat = this.patients.find((p) => p.id === rx.patientId);
      const doc = this.doctors.find((d) => d.id === rx.doctorId);
      const userDoc = doc ? this.users.find((u) => u.id === doc.userId) : null;
      return {
        ...rx,
        patientName: pat?.fullName,
        patientIdNumber: pat?.patientId,
        doctorName: userDoc?.fullName,
        items: rx.items.map((it: any) => {
          const med = this.medicines.find((m) => m.id === it.medicineId);
          return {
            ...it,
            brandName: med?.brandName || 'Medicine',
            genericName: med?.genericName,
            dosageForm: med?.dosageForm,
            unitPrice: med?.unitPrice || 0,
          };
        }),
      };
    });
  }

  async dispensePrescription(prescriptionId: string, itemsToDispense: any[], userId: string) {
    await this.init();
    const rxIndex = this.prescriptions.findIndex((p) => p.id === prescriptionId);
    if (rxIndex === -1) throw new Error('Prescription not found');

    const rx = this.prescriptions[rxIndex];
    if (rx.status === 'DISPENSED') throw new Error('Prescription is already dispensed.');

    // Process each item with stock validation and expiry check
    for (const item of itemsToDispense) {
      const batch = this.batches.find((b) => b.id === item.batchId);
      if (!batch) throw new Error(`Batch not found for item`);
      if (batch.isQuarantined) throw new Error(`Batch ${batch.batchNumber} is quarantined`);

      // Check expiry date
      const expiry = new Date(batch.expiryDate).getTime();
      if (expiry <= Date.now()) {
        throw new Error(`Cannot dispense medicine from expired batch: ${batch.batchNumber}`);
      }

      // Check stock
      if (batch.currentQuantity < item.quantityToDispense) {
        throw new Error(`Insufficient stock in batch ${batch.batchNumber} (Available: ${batch.currentQuantity})`);
      }

      // Deduct from batch
      batch.currentQuantity -= item.quantityToDispense;

      // Deduct from overall medicine stock
      const med = this.medicines.find((m) => m.id === item.medicineId);
      if (med) {
        const prev = med.currentStock;
        med.currentStock = Math.max(0, med.currentStock - item.quantityToDispense);

        // Record stock movement
        this.stockMovements.push({
          id: `sm-${Date.now()}`,
          medicineId: med.id,
          batchId: batch.id,
          movementType: 'DISPENSE',
          quantity: item.quantityToDispense,
          previousStock: prev,
          newStock: med.currentStock,
          referenceId: rx.prescriptionNo,
          notes: `Dispensed for prescription ${rx.prescriptionNo}`,
          performedByUserId: userId,
          createdAt: new Date().toISOString(),
        });
      }

      // Update dispensed count on prescription item
      const pItem = rx.items.find((i: any) => i.id === item.prescriptionItemId || i.medicineId === item.medicineId);
      if (pItem) {
        pItem.quantityDispensed = (pItem.quantityDispensed || 0) + item.quantityToDispense;
      }
    }

    rx.status = 'DISPENSED';
    rx.dispensedByUserId = userId;
    rx.dispensedAt = new Date().toISOString();
    rx.updatedAt = new Date().toISOString();

    return rx;
  }

  // --- Pharmacy Inventory ---
  async listMedicines() {
    await this.init();
    return this.medicines.map((m) => {
      const batches = this.batches.filter((b) => b.medicineId === m.id);
      return {
        ...m,
        batches,
        isLowStock: m.currentStock <= m.reorderLevel,
      };
    });
  }

  async createMedicine(data: any) {
    await this.init();
    const newMed = {
      id: `med-${Date.now()}`,
      currentStock: 0,
      isActive: true,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.medicines.push(newMed);
    return newMed;
  }

  async addMedicineBatch(data: any, userId: string) {
    await this.init();
    const batchId = `batch-${Date.now()}`;
    const newBatch = {
      id: batchId,
      currentQuantity: data.purchaseQuantity,
      isQuarantined: false,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.batches.push(newBatch);

    // Update medicine current stock
    const med = this.medicines.find((m) => m.id === data.medicineId);
    if (med) {
      const prev = med.currentStock;
      med.currentStock += data.purchaseQuantity;

      this.stockMovements.push({
        id: `sm-${Date.now()}`,
        medicineId: med.id,
        batchId: newBatch.id,
        movementType: 'PURCHASE',
        quantity: data.purchaseQuantity,
        previousStock: prev,
        newStock: med.currentStock,
        referenceId: data.batchNumber,
        notes: `New batch purchase received: ${data.batchNumber}`,
        performedByUserId: userId,
        createdAt: new Date().toISOString(),
      });
    }

    return newBatch;
  }

  // --- Laboratory ---
  async listLaboratoryTests() {
    await this.init();
    return this.labTests;
  }

  async listLaboratoryRequests(filter?: { status?: string; patientId?: string }) {
    await this.init();
    let list = [...this.labRequests];
    if (filter?.status) list = list.filter((r) => r.status === filter.status);
    if (filter?.patientId) list = list.filter((r) => r.patientId === filter.patientId);

    return list.map((lr) => {
      const pat = this.patients.find((p) => p.id === lr.patientId);
      const doc = this.doctors.find((d) => d.id === lr.doctorId);
      const userDoc = doc ? this.users.find((u) => u.id === doc.userId) : null;
      return {
        ...lr,
        patientName: pat?.fullName,
        patientIdNumber: pat?.patientId,
        doctorName: userDoc?.fullName,
        results: lr.results.map((res: any) => {
          const test = this.labTests.find((t) => t.id === res.laboratoryTestId);
          return {
            ...res,
            testName: test?.name || 'Lab Test',
            testCode: test?.code,
            testCategory: test?.category,
            sampleType: test?.sampleType,
            referenceRanges: test?.referenceRangesJson ? JSON.parse(test.referenceRangesJson) : null,
          };
        }),
      };
    });
  }

  async createLaboratoryRequest(data: any) {
    await this.init();
    const reqNum = `LR-2026-${(this.labRequests.length + 1).toString().padStart(4, '0')}`;
    const requestId = `lr-${Date.now()}`;
    const newReq = {
      id: requestId,
      requestNumber: reqNum,
      patientId: data.patientId,
      doctorId: data.doctorId,
      status: 'REQUESTED',
      priority: data.priority || 'ROUTINE',
      clinicalHistory: data.clinicalHistory || '',
      results: data.testIds.map((testId: string, idx: number) => ({
        id: `lres-${Date.now()}-${idx}`,
        laboratoryRequestId: requestId,
        laboratoryTestId: testId,
        resultValuesJson: null,
        status: 'PENDING',
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.labRequests.unshift(newReq);
    return newReq;
  }

  async updateSampleCollection(requestId: string, userId: string) {
    await this.init();
    const req = this.labRequests.find((r) => r.id === requestId);
    if (!req) return null;
    req.status = 'SAMPLE_COLLECTED';
    req.sampleCollectedAt = new Date().toISOString();
    req.sampleCollectedByUserId = userId;
    req.updatedAt = new Date().toISOString();
    return req;
  }

  async enterLabResult(resultId: string, resultValuesJson: string, notes?: string) {
    await this.init();
    for (const req of this.labRequests) {
      const res = req.results.find((r: any) => r.id === resultId);
      if (res) {
        res.resultValuesJson = resultValuesJson;
        res.status = 'COMPLETED';
        res.notes = notes || null;
        res.updatedAt = new Date().toISOString();

        // Check if all results in the request are completed
        const allDone = req.results.every((r: any) => r.status === 'COMPLETED' || r.status === 'VERIFIED');
        if (allDone) req.status = 'COMPLETED';
        req.updatedAt = new Date().toISOString();
        return res;
      }
    }
    return null;
  }

  async verifyLabResult(resultId: string, userId: string) {
    await this.init();
    for (const req of this.labRequests) {
      const res = req.results.find((r: any) => r.id === resultId);
      if (res) {
        res.status = 'VERIFIED';
        res.verifiedByUserId = userId;
        res.verifiedAt = new Date().toISOString();
        res.updatedAt = new Date().toISOString();
        return res;
      }
    }
    return null;
  }

  // --- Inpatient Wards & Admissions ---
  async listWards() {
    await this.init();
    return this.wards.map((w) => {
      const beds = this.beds.filter((b) => b.wardId === w.id);
      return {
        ...w,
        beds,
        occupiedBeds: beds.filter((b) => b.status === 'OCCUPIED').length,
        availableBeds: beds.filter((b) => b.status === 'AVAILABLE').length,
      };
    });
  }

  async listAdmissions(status?: string) {
    await this.init();
    let list = [...this.admissions];
    if (status) list = list.filter((a) => a.status === status);

    return list.map((adm) => {
      const pat = this.patients.find((p) => p.id === adm.patientId);
      const ward = this.wards.find((w) => w.id === adm.wardId);
      const bed = this.beds.find((b) => b.id === adm.bedId);
      const doc = this.doctors.find((d) => d.id === adm.admittingDoctorId);
      const userDoc = doc ? this.users.find((u) => u.id === doc.userId) : null;
      return {
        ...adm,
        patientName: pat?.fullName,
        patientIdNumber: pat?.patientId,
        wardName: ward?.name,
        bedNumber: bed?.bedNumber,
        doctorName: userDoc?.fullName,
      };
    });
  }

  async admitPatient(data: any) {
    await this.init();
    const bed = this.beds.find((b) => b.id === data.bedId);
    if (!bed) throw new Error('Bed not found');
    if (bed.status !== 'AVAILABLE') throw new Error(`Selected bed ${bed.bedNumber} is not available.`);

    const ward = this.wards.find((w) => w.id === data.wardId);
    const admNum = `ADM-2026-${(this.admissions.length + 1).toString().padStart(4, '0')}`;
    const newAdm = {
      id: `adm-${Date.now()}`,
      admissionNumber: admNum,
      patientId: data.patientId,
      wardId: data.wardId,
      bedId: data.bedId,
      admittingDoctorId: data.admittingDoctorId,
      admissionDate: new Date().toISOString(),
      dischargeDate: null,
      status: 'ADMITTED',
      initialDiagnosis: data.initialDiagnosis,
      dailyChargeRate: ward?.dailyRate || 3500.00,
      totalWardCharge: 0.00,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Mark bed occupied
    bed.status = 'OCCUPIED';
    bed.updatedAt = new Date().toISOString();
    this.admissions.unshift(newAdm);
    return newAdm;
  }

  async dischargePatient(admissionId: string, dischargeSummary: string) {
    await this.init();
    const adm = this.admissions.find((a) => a.id === admissionId);
    if (!adm) throw new Error('Admission record not found');

    const dischargeTime = new Date();
    const admissionTime = new Date(adm.admissionDate);
    const diffDays = Math.max(1, Math.ceil((dischargeTime.getTime() - admissionTime.getTime()) / (1000 * 60 * 60 * 24)));
    const totalWardCharge = diffDays * adm.dailyChargeRate;

    adm.status = 'DISCHARGED';
    adm.dischargeDate = dischargeTime.toISOString();
    adm.dischargeSummary = dischargeSummary;
    adm.totalWardCharge = totalWardCharge;
    adm.updatedAt = dischargeTime.toISOString();

    // Mark bed available
    const bed = this.beds.find((b) => b.id === adm.bedId);
    if (bed) {
      bed.status = 'AVAILABLE';
      bed.updatedAt = dischargeTime.toISOString();
    }

    return adm;
  }

  // --- Billing & Invoicing ---
  async listInvoices() {
    await this.init();
    return this.invoices.map((inv) => {
      const pat = this.patients.find((p) => p.id === inv.patientId);
      return {
        ...inv,
        patientName: pat?.fullName,
        patientIdNumber: pat?.patientId,
      };
    });
  }

  async findInvoiceById(id: string) {
    await this.init();
    const inv = this.invoices.find((i) => i.id === id || i.invoiceNumber === id);
    if (!inv) return null;
    const pat = this.patients.find((p) => p.id === inv.patientId);
    return {
      ...inv,
      patientName: pat?.fullName,
      patientIdNumber: pat?.patientId,
      patientPhone: pat?.phone,
      patientAddress: pat?.address,
    };
  }

  async createInvoice(data: any, userId: string) {
    await this.init();
    // Server-side financial calculation - NEVER trust client totals!
    let totalAmount = 0;
    const items = data.items.map((it: any, idx: number) => {
      const qty = parseInt(it.quantity, 10);
      const price = parseFloat(it.unitPrice);
      const lineTotal = qty * price;
      totalAmount += lineTotal;
      return {
        id: `invi-${Date.now()}-${idx}`,
        itemType: it.itemType,
        description: it.description,
        quantity: qty,
        unitPrice: price,
        totalPrice: lineTotal,
        referenceId: it.referenceId || null,
      };
    });

    const discount = parseFloat(data.discountAmount || 0);
    const tax = parseFloat(data.taxAmount || 0);
    const netAmount = Math.max(0, totalAmount - discount + tax);

    const invNum = `INV-2026-${(this.invoices.length + 1).toString().padStart(4, '0')}`;
    const newInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invNum,
      patientId: data.patientId,
      admissionId: data.admissionId || null,
      totalAmount,
      discountAmount: discount,
      taxAmount: tax,
      netAmount,
      paidAmount: 0.00,
      balanceAmount: netAmount,
      status: 'UNPAID',
      issuedByUserId: userId,
      notes: data.notes || '',
      items,
      payments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.invoices.unshift(newInvoice);
    return newInvoice;
  }

  async recordPayment(invoiceId: string, paymentData: any, userId: string) {
    await this.init();
    const invoice = this.invoices.find((i) => i.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const amount = parseFloat(paymentData.amount);
    if (amount <= 0) throw new Error('Payment amount must be greater than zero');
    if (amount > invoice.balanceAmount + 0.01) {
      throw new Error(`Payment cannot exceed outstanding balance of LKR ${invoice.balanceAmount.toFixed(2)}`);
    }

    const receiptNum = `REC-2026-${(this.payments.length + 1).toString().padStart(4, '0')}`;
    const newPayment = {
      id: `pay-${Date.now()}`,
      receiptNumber: receiptNum,
      invoiceId: invoice.id,
      amount,
      paymentMethod: paymentData.paymentMethod,
      paymentReference: paymentData.paymentReference || null,
      notes: paymentData.notes || '',
      receivedByUserId: userId,
      createdAt: new Date().toISOString(),
    };

    this.payments.unshift(newPayment);
    if (!invoice.payments) invoice.payments = [];
    invoice.payments.push(newPayment);

    // Update invoice financial state
    invoice.paidAmount += amount;
    invoice.balanceAmount = Math.max(0, invoice.netAmount - invoice.paidAmount);
    if (invoice.balanceAmount <= 0) {
      invoice.status = 'PAID';
    } else {
      invoice.status = 'PARTIALLY_PAID';
    }
    invoice.updatedAt = new Date().toISOString();

    return { payment: newPayment, invoice };
  }

  // --- Staff & Attendance ---
  async listEmployees() {
    await this.init();
    return this.employees.map((emp) => {
      const dept = this.departments.find((d) => d.id === emp.departmentId);
      return {
        ...emp,
        departmentName: dept?.name || 'General',
      };
    });
  }

  async listAttendance(date?: string) {
    await this.init();
    let list = [...this.attendance];
    if (date) list = list.filter((a) => a.date === date);

    return list.map((att) => {
      const emp = this.employees.find((e) => e.id === att.employeeId);
      return {
        ...att,
        employeeName: emp?.fullName,
        employeeNumber: emp?.employeeNumber,
        designation: emp?.designation,
      };
    });
  }

  async markAttendance(data: any) {
    await this.init();
    const existing = this.attendance.find((a) => a.employeeId === data.employeeId && a.date === data.date);
    if (existing) {
      existing.checkInTime = data.checkInTime || existing.checkInTime;
      existing.checkOutTime = data.checkOutTime || existing.checkOutTime;
      existing.status = data.status || existing.status;
      return existing;
    }
    const newAtt = {
      id: `att-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    this.attendance.push(newAtt);
    return newAtt;
  }

  async createEmployee(data: any) {
    await this.init();
    const nextNum = (this.employees.length + 1).toString().padStart(3, '0');
    const newEmp = {
      id: `emp-${Date.now()}`,
      employeeNumber: `EMP-${nextNum}`,
      isActive: true,
      joinedDate: new Date().toISOString().split('T')[0],
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.employees.push(newEmp);
    return newEmp;
  }

  async updateEmployee(id: string, updates: any) {
    await this.init();
    const index = this.employees.findIndex((e) => e.id === id || e.employeeNumber === id);
    if (index === -1) return null;
    this.employees[index] = {
      ...this.employees[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.employees[index];
  }

  async deleteEmployee(id: string) {
    await this.init();
    const index = this.employees.findIndex((e) => e.id === id || e.employeeNumber === id);
    if (index === -1) return false;
    this.employees.splice(index, 1);
    return true;
  }

  // --- Staff Task Assignments ---
  async listStaffTasks(employeeId?: string) {
    await this.init();
    let list = [...this.staffTasks];
    if (employeeId) list = list.filter((t) => t.employeeId === employeeId);
    return list.map((task) => {
      const emp = this.employees.find((e) => e.id === task.employeeId);
      return {
        ...task,
        employeeName: emp?.fullName || 'Assigned Staff',
        designation: emp?.designation,
      };
    });
  }

  async createStaffTask(data: any, assignedByUserId: string) {
    await this.init();
    const newTask = {
      id: `task-${Date.now()}`,
      employeeId: data.employeeId,
      title: data.title,
      description: data.description || '',
      priority: data.priority || 'MEDIUM', // LOW, MEDIUM, HIGH, URGENT
      shift: data.shift || 'Morning Shift',
      dueDate: data.dueDate || new Date().toISOString().split('T')[0],
      status: 'PENDING', // PENDING, IN_PROGRESS, COMPLETED
      assignedByUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.staffTasks.unshift(newTask);
    return newTask;
  }

  async updateStaffTask(taskId: string, updates: any) {
    await this.init();
    const index = this.staffTasks.findIndex((t) => t.id === taskId);
    if (index === -1) return null;
    this.staffTasks[index] = {
      ...this.staffTasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.staffTasks[index];
  }

  async deleteStaffTask(taskId: string) {
    await this.init();
    const index = this.staffTasks.findIndex((t) => t.id === taskId);
    if (index === -1) return false;
    this.staffTasks.splice(index, 1);
    return true;
  }

  // --- Audit Logs ---
  async recordAudit(data: {
    userId?: string;
    username: string;
    userRole: string;
    action: string;
    entityName: string;
    entityId?: string;
    detailsJson?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await this.init();
    const entry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...data,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(entry);
    return entry;
  }

  async listAuditLogs(options?: { action?: string; limit?: number }) {
    await this.init();
    let list = [...this.auditLogs];
    if (options?.action) {
      list = list.filter((a) => a.action === options.action);
    }
    const limit = options?.limit || 50;
    return list.slice(0, limit);
  }

  // --- Settings & Logo ---
  async getSettings() {
    await this.init();
    const result: Record<string, string> = {};
    for (const [key, value] of this.settings.entries()) {
      result[key] = value;
    }
    return result;
  }

  async updateSetting(key: string, value: string) {
    await this.init();
    this.settings.set(key, value);
    return { key, value };
  }

  // --- Dashboard Aggregations ---
  async getDashboardMetrics() {
    await this.init();
    const todayStr = new Date().toISOString().split('T')[0];

    const totalPatients = this.patients.length;
    const todayAppointments = this.appointments.filter((a) => a.appointmentDate === todayStr).length;
    const upcomingAppointments = this.appointments.filter((a) => a.appointmentDate >= todayStr && a.status === 'SCHEDULED').length;

    // Revenue calculations
    const totalRevenueLKR = this.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const pendingInvoicesLKR = this.invoices
      .filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED')
      .reduce((sum, i) => sum + parseFloat(i.balanceAmount), 0);

    const pendingLabRequests = this.labRequests.filter((lr) => lr.status === 'REQUESTED' || lr.status === 'SAMPLE_COLLECTED').length;

    // Inventory alerts
    const lowStockMedicines = this.medicines.filter((m) => m.currentStock <= m.reorderLevel);
    
    // Expiring in next 60 days
    const nowMs = Date.now();
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
    const expiringBatches = this.batches.filter((b) => {
      const exp = new Date(b.expiryDate).getTime();
      return exp > nowMs && exp <= nowMs + sixtyDaysMs;
    });

    const activeAdmissions = this.admissions.filter((a) => a.status === 'ADMITTED').length;
    const recentActivities = this.auditLogs.slice(0, 10);

    return {
      totalPatients,
      todayAppointments,
      upcomingAppointments,
      totalRevenueLKR,
      pendingInvoicesLKR,
      pendingLabRequests,
      lowStockCount: lowStockMedicines.length,
      expiringCount: expiringBatches.length,
      activeAdmissions,
      lowStockMedicines: lowStockMedicines.map((m) => ({ id: m.id, name: m.brandName, generic: m.genericName, stock: m.currentStock, reorder: m.reorderLevel })),
      expiringBatches: expiringBatches.map((b) => {
        const med = this.medicines.find((m) => m.id === b.medicineId);
        return {
          id: b.id,
          medicineName: med?.brandName || 'Medicine',
          batchNumber: b.batchNumber,
          expiryDate: b.expiryDate,
          quantity: b.currentQuantity,
        };
      }),
      recentActivities,
    };
  }
}

export const repository = new MediPlusRepository();
