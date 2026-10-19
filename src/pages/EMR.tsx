import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { formatSriLankanDate, formatSriLankanDateTime } from '../utils/srilankan';
import { FileText, Plus, Activity, Pill, User, AlertCircle, Stethoscope } from 'lucide-react';

export const EMR: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [examinationNotes, setExaminationNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [icdCode, setIcdCode] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');

  // Vitals
  const [vitalsSystolic, setVitalsSystolic] = useState<number | ''>('');
  const [vitalsDiastolic, setVitalsDiastolic] = useState<number | ''>('');
  const [vitalsPulse, setVitalsPulse] = useState<number | ''>('');
  const [vitalsTemp, setVitalsTemp] = useState<number | ''>('');
  const [vitalsSpo2, setVitalsSpo2] = useState<number | ''>('');
  const [vitalsWeightKg, setVitalsWeightKg] = useState<number | ''>('');

  // Prescription items
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [recRes, patRes, docRes, medRes] = await Promise.all([
        apiRequest('/api/emr/records'),
        apiRequest('/api/patients'),
        apiRequest('/api/doctors'),
        apiRequest('/api/pharmacy/medicines'),
      ]);

      if (recRes.success) setRecords(recRes.records);
      if (patRes.success) {
        setPatients(patRes.data);
        if (patRes.data.length > 0 && !patientId) setPatientId(patRes.data[0].id);
      }
      if (docRes.success) {
        setDoctors(docRes.doctors);
        if (docRes.doctors.length > 0 && !doctorId) setDoctorId(docRes.doctors[0].id);
      }
      if (medRes.success) setMedicines(medRes.medicines);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addPrescriptionItem = () => {
    if (medicines.length === 0) return;
    setPrescriptions([
      ...prescriptions,
      {
        medicineId: medicines[0].id,
        dosage: '500mg',
        frequency: 'TDS (Three times daily) - After meals',
        durationDays: 3,
        instructions: 'Take after meals',
        quantityPrescribed: 10,
      },
    ]);
  };

  const removePrescriptionItem = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setFormError(null);

      const payload = {
        patientId,
        doctorId,
        chiefComplaint,
        examinationNotes: examinationNotes || null,
        diagnosis,
        icdCode: icdCode || null,
        treatmentPlan: treatmentPlan || null,
        vitalsSystolic: vitalsSystolic === '' ? null : Number(vitalsSystolic),
        vitalsDiastolic: vitalsDiastolic === '' ? null : Number(vitalsDiastolic),
        vitalsPulse: vitalsPulse === '' ? null : Number(vitalsPulse),
        vitalsTemp: vitalsTemp === '' ? null : Number(vitalsTemp),
        vitalsSpo2: vitalsSpo2 === '' ? null : Number(vitalsSpo2),
        vitalsWeightKg: vitalsWeightKg === '' ? null : Number(vitalsWeightKg),
        prescriptions: prescriptions.length > 0 ? prescriptions : undefined,
      };

      const res = await apiRequest('/api/emr/records', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setIsOpen(false);
        // Reset form
        setChiefComplaint('');
        setExaminationNotes('');
        setDiagnosis('');
        setIcdCode('');
        setTreatmentPlan('');
        setPrescriptions([]);
        fetchData();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save clinical record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreate = ['ADMIN', 'DOCTOR'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Electronic Medical Records (EMR)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Clinical diagnoses, vitals monitoring, and authorized prescriptions
          </p>
        </div>

        {canCreate && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            New Clinical Entry
          </Button>
        )}
      </div>

      {/* Records Feed */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
            Loading clinical entries...
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
            No clinical records logged yet.
          </div>
        ) : (
          records.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="font-bold text-base text-slate-900">{r.patientName}</h3>
                  <span className="text-xs text-slate-500 font-mono">Patient ID: {r.patientIdNumber}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-teal-800">{r.doctorName}</div>
                  <div className="text-[11px] text-slate-400">{formatSriLankanDateTime(r.visitDate)}</div>
                </div>
              </div>

              {/* Vitals Ribbon */}
              {(r.vitalsSystolic || r.vitalsTemp || r.vitalsPulse) && (
                <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-rose-500" />
                    Vitals:
                  </span>
                  {r.vitalsSystolic && (
                    <span className="text-slate-800 font-mono">
                      BP: <strong>{r.vitalsSystolic}/{r.vitalsDiastolic}</strong> mmHg
                    </span>
                  )}
                  {r.vitalsPulse && (
                    <span className="text-slate-800 font-mono">
                      Pulse: <strong>{r.vitalsPulse}</strong> bpm
                    </span>
                  )}
                  {r.vitalsTemp && (
                    <span className="text-slate-800 font-mono">
                      Temp: <strong>{r.vitalsTemp}</strong>°C
                    </span>
                  )}
                  {r.vitalsSpo2 && (
                    <span className="text-slate-800 font-mono">
                      SpO2: <strong>{r.vitalsSpo2}</strong>%
                    </span>
                  )}
                  {r.vitalsWeightKg && (
                    <span className="text-slate-800 font-mono">
                      Weight: <strong>{r.vitalsWeightKg}</strong> kg
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-slate-700">Chief Complaint: </span>
                  <span className="text-slate-900">{r.chiefComplaint}</span>
                </div>
                {r.examinationNotes && (
                  <div>
                    <span className="font-bold text-slate-700">Clinical Examination: </span>
                    <span className="text-slate-900">{r.examinationNotes}</span>
                  </div>
                )}
                <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-lg">
                  <span className="font-bold text-teal-900">Diagnosis: </span>
                  <span className="font-semibold text-slate-900">{r.diagnosis}</span>
                  {r.icdCode && <span className="ml-2 font-mono text-xs text-teal-800">[{r.icdCode}]</span>}
                </div>
                {r.treatmentPlan && (
                  <div>
                    <span className="font-bold text-slate-700">Management & Treatment Plan: </span>
                    <span className="text-slate-900">{r.treatmentPlan}</span>
                  </div>
                )}
              </div>

              {/* Prescriptions Attached */}
              {r.prescriptions && r.prescriptions.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                    <Pill className="w-4 h-4 text-teal-600" />
                    Prescriptions ({r.prescriptions.length}):
                  </div>
                  {r.prescriptions.map((rx: any) => (
                    <div key={rx.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between font-mono font-semibold text-teal-800">
                        <span>{rx.prescriptionNo}</span>
                        <Badge variant={rx.status === 'DISPENSED' ? 'success' : 'warning'} size="sm">
                          {rx.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {rx.items?.map((it: any, i: number) => (
                          <div key={i} className="py-0.5">
                            • {it.dosage} — {it.frequency} for {it.durationDays} days ({it.quantityPrescribed} units prescribed)
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Clinical Entry Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Record Clinical Examination & Prescription"
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Patient *"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              options={patients.map((p) => ({
                label: `${p.fullName} (${p.patientId})`,
                value: p.id,
              }))}
            />
            <Select
              label="Consultant Doctor *"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              options={doctors.map((d) => ({
                label: `${d.fullName} (${d.specialization})`,
                value: d.id,
              }))}
            />
          </div>

          <Input
            label="Chief Complaint *"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="e.g. Acute onset fever and headache for 3 days"
            required
          />

          <Input
            label="Examination & Physical Findings"
            value={examinationNotes}
            onChange={(e) => setExaminationNotes(e.target.value)}
            placeholder="e.g. Throat congested, epigastric tenderness present"
          />

          {/* Vitals Grid */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-700">Patient Vitals</h4>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <Input
                label="BP Systolic"
                type="number"
                value={vitalsSystolic}
                onChange={(e) => setVitalsSystolic(e.target.value ? Number(e.target.value) : '')}
                placeholder="120"
              />
              <Input
                label="BP Diastolic"
                type="number"
                value={vitalsDiastolic}
                onChange={(e) => setVitalsDiastolic(e.target.value ? Number(e.target.value) : '')}
                placeholder="80"
              />
              <Input
                label="Pulse (bpm)"
                type="number"
                value={vitalsPulse}
                onChange={(e) => setVitalsPulse(e.target.value ? Number(e.target.value) : '')}
                placeholder="72"
              />
              <Input
                label="Temp (°C)"
                type="number"
                step="0.1"
                value={vitalsTemp}
                onChange={(e) => setVitalsTemp(e.target.value ? Number(e.target.value) : '')}
                placeholder="37.0"
              />
              <Input
                label="SpO2 (%)"
                type="number"
                value={vitalsSpo2}
                onChange={(e) => setVitalsSpo2(e.target.value ? Number(e.target.value) : '')}
                placeholder="98"
              />
              <Input
                label="Weight (kg)"
                type="number"
                step="0.1"
                value={vitalsWeightKg}
                onChange={(e) => setVitalsWeightKg(e.target.value ? Number(e.target.value) : '')}
                placeholder="68.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Clinical Diagnosis *"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Viral Pharyngitis / Probable Dengue Fever"
              required
            />
            <Input
              label="ICD-10 Code"
              value={icdCode}
              onChange={(e) => setIcdCode(e.target.value)}
              placeholder="e.g. J02.9 or A97.0"
            />
          </div>

          <Input
            label="Treatment Plan / Doctor Recommendations"
            value={treatmentPlan}
            onChange={(e) => setTreatmentPlan(e.target.value)}
            placeholder="e.g. Bed rest, adequate oral fluid intake, avoid NSAIDs"
          />

          {/* Prescription Items Builder */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-slate-800">Prescription Medications</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPrescriptionItem}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Medication
              </Button>
            </div>

            {prescriptions.map((p, idx) => (
              <div key={idx} className="p-3 mb-2 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">Drug #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removePrescriptionItem(idx)}
                    className="text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Select
                    label="Medicine"
                    value={p.medicineId}
                    onChange={(e) => {
                      const updated = [...prescriptions];
                      updated[idx].medicineId = e.target.value;
                      setPrescriptions(updated);
                    }}
                    options={medicines.map((m) => ({
                      label: `${m.brandName} (${m.genericName} - ${m.strength})`,
                      value: m.id,
                    }))}
                  />
                  <Input
                    label="Dosage"
                    value={p.dosage}
                    onChange={(e) => {
                      const updated = [...prescriptions];
                      updated[idx].dosage = e.target.value;
                      setPrescriptions(updated);
                    }}
                    placeholder="e.g. 500mg"
                  />
                  <Input
                    label="Frequency"
                    value={p.frequency}
                    onChange={(e) => {
                      const updated = [...prescriptions];
                      updated[idx].frequency = e.target.value;
                      setPrescriptions(updated);
                    }}
                    placeholder="e.g. TDS - after meals"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Clinical Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
