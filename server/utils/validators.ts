import { z } from 'zod';
import { validateSriLankanNIC, validateSriLankanPhone } from './srilanka';

export const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const patientSchema = z.object({
  fullName: z.string().min(3, 'Full name is required (at least 3 characters)'),
  nic: z.string().optional().nullable().refine((val) => {
    if (!val || val.trim() === '') return true;
    return validateSriLankanNIC(val).isValid;
  }, { message: 'Invalid Sri Lankan NIC format (e.g. 853412589V or 198534125890)' }),
  passport: z.string().optional().nullable(),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Valid date of birth is required' }),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  bloodGroup: z.string().optional().nullable(),
  phone: z.string().refine((val) => validateSriLankanPhone(val).isValid, {
    message: 'Valid Sri Lankan phone number is required (e.g. 0771234567 or +94 77 123 4567)',
  }),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  address: z.string().min(3, 'Residential address is required'),
  province: z.string().min(2, 'Province is required'),
  district: z.string().min(2, 'District is required'),
  postalCode: z.string().optional().nullable(),
  emergencyContactName: z.string().min(2, 'Emergency contact person name is required'),
  emergencyContactPhone: z.string().refine((val) => validateSriLankanPhone(val).isValid, {
    message: 'Valid Sri Lankan emergency phone number is required',
  }),
  emergencyContactRelation: z.string().min(2, 'Relationship is required (e.g. Spouse, Parent, Sibling)'),
  allergies: z.string().optional().nullable(),
  medicalAlerts: z.string().optional().nullable(),
});

export const doctorSchema = z.object({
  userId: z.string().optional(),
  fullName: z.string().min(3, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  username: z.string().min(3, 'Username is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  slmcRegNo: z.string().min(3, 'Valid SLMC registration number is required'),
  specialization: z.string().min(2, 'Specialization is required'),
  qualification: z.string().min(2, 'Qualifications are required (e.g. MBBS, MD, FRCS)'),
  consultationFee: z.number().min(0, 'Consultation fee must be non-negative'),
  departmentId: z.string().min(1, 'Department selection is required'),
  roomNumber: z.string().optional().nullable(),
  availableDays: z.string().default('Monday,Tuesday,Wednesday,Thursday,Friday'),
  morningSlotStart: z.string().optional().nullable(),
  morningSlotEnd: z.string().optional().nullable(),
  eveningSlotStart: z.string().optional().nullable(),
  eveningSlotEnd: z.string().optional().nullable(),
  maxPatientsPerSlot: z.number().min(1).default(20),
});

export const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient selection is required'),
  doctorId: z.string().min(1, 'Doctor selection is required'),
  departmentId: z.string().min(1, 'Department selection is required'),
  appointmentDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Valid date is required' }),
  slotTime: z.string().min(2, 'Slot time is required (e.g. 09:00 AM)'),
  type: z.enum(['OPD', 'CONSULTATION', 'FOLLOW_UP', 'EMERGENCY']).default('CONSULTATION'),
  notes: z.string().optional().nullable(),
});

export const medicalRecordSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  appointmentId: z.string().optional().nullable(),
  chiefComplaint: z.string().min(2, 'Chief complaint is required'),
  examinationNotes: z.string().optional().nullable(),
  diagnosis: z.string().min(2, 'Diagnosis is required'),
  icdCode: z.string().optional().nullable(),
  treatmentPlan: z.string().optional().nullable(),
  vitalsSystolic: z.number().min(50).max(250).optional().nullable(),
  vitalsDiastolic: z.number().min(30).max(180).optional().nullable(),
  vitalsPulse: z.number().min(30).max(220).optional().nullable(),
  vitalsTemp: z.number().min(30).max(45).optional().nullable(),
  vitalsSpo2: z.number().min(50).max(100).optional().nullable(),
  vitalsWeightKg: z.number().min(1).max(350).optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  prescriptions: z.array(z.object({
    medicineId: z.string().min(1, 'Medicine is required'),
    dosage: z.string().min(1, 'Dosage is required (e.g. 500mg)'),
    frequency: z.string().min(1, 'Frequency is required (e.g. TDS - after meals)'),
    durationDays: z.number().min(1, 'Duration must be at least 1 day'),
    instructions: z.string().optional().nullable(),
    quantityPrescribed: z.number().min(1, 'Quantity prescribed must be at least 1'),
  })).optional(),
});

export const medicineSchema = z.object({
  code: z.string().min(2, 'Medicine code is required'),
  brandName: z.string().min(2, 'Brand name is required'),
  genericName: z.string().min(2, 'Generic name is required'),
  category: z.string().min(2, 'Category is required'),
  dosageForm: z.string().min(2, 'Dosage form is required'),
  strength: z.string().min(1, 'Strength is required (e.g. 500mg, 10ml)'),
  unit: z.string().min(1, 'Unit is required (e.g. tablets, capsules, bottles)'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  reorderLevel: z.number().min(1, 'Reorder level must be positive'),
  manufacturer: z.string().optional().nullable(),
});

export const medicineBatchSchema = z.object({
  medicineId: z.string().min(1, 'Medicine ID is required'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  manufacturingDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Valid manufacturing date is required' }),
  expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Valid expiry date is required' }),
  purchaseQuantity: z.number().min(1, 'Purchase quantity must be at least 1'),
  purchasePrice: z.number().min(0, 'Purchase price must be non-negative'),
  sellingPrice: z.number().min(0, 'Selling price must be non-negative'),
  supplier: z.string().optional().nullable(),
});

export const dispensePrescriptionSchema = z.object({
  prescriptionId: z.string().min(1, 'Prescription ID is required'),
  items: z.array(z.object({
    prescriptionItemId: z.string().min(1),
    medicineId: z.string().min(1),
    batchId: z.string().min(1, 'Batch selection is required'),
    quantityToDispense: z.number().min(1, 'Quantity must be at least 1'),
  })),
});

export const labRequestSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  testIds: z.array(z.string().min(1)).min(1, 'At least one laboratory test must be selected'),
  priority: z.enum(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
  clinicalHistory: z.string().optional().nullable(),
});

export const labResultEntrySchema = z.object({
  resultId: z.string().min(1, 'Result ID is required'),
  resultValuesJson: z.string().min(2, 'Result values JSON is required'),
  notes: z.string().optional().nullable(),
});

export const invoiceSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  admissionId: z.string().optional().nullable(),
  items: z.array(z.object({
    itemType: z.enum(['CONSULTATION', 'LAB_TEST', 'PHARMACY', 'WARD_CHARGE', 'PROCEDURE', 'OTHER']),
    description: z.string().min(1, 'Item description is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().min(0, 'Unit price must be non-negative'),
    referenceId: z.string().optional().nullable(),
  })).min(1, 'Invoice must have at least one billable item'),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export const paymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  amount: z.number().min(0.01, 'Payment amount must be greater than zero'),
  paymentMethod: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'INSURANCE', 'ONLINE']),
  paymentReference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const admissionSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  wardId: z.string().min(1, 'Ward selection is required'),
  bedId: z.string().min(1, 'Bed selection is required'),
  admittingDoctorId: z.string().min(1, 'Admitting doctor is required'),
  initialDiagnosis: z.string().min(2, 'Initial diagnosis is required'),
});

export const dischargeSchema = z.object({
  admissionId: z.string().min(1, 'Admission ID is required'),
  dischargeSummary: z.string().min(3, 'Discharge summary is required'),
});
