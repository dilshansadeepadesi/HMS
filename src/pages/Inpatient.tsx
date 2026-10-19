import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { formatLKR, formatSriLankanDate, formatSriLankanDateTime } from '../utils/srilankan';
import { Bed, Plus, LogOut, CheckCircle, AlertCircle, Building2 } from 'lucide-react';

export const Inpatient: React.FC = () => {
  const { user } = useAuth();
  const [wards, setWards] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Admit Modal
  const [isAdmitOpen, setIsAdmitOpen] = useState(false);
  const [admitForm, setAdmitForm] = useState({
    patientId: '',
    wardId: '',
    bedId: '',
    admittingDoctorId: '',
    initialDiagnosis: '',
  });

  // Discharge Modal
  const [dischargeTarget, setDischargeTarget] = useState<any | null>(null);
  const [dischargeSummary, setDischargeSummary] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [wardRes, admRes, patRes, docRes] = await Promise.all([
        apiRequest('/api/inpatient/wards'),
        apiRequest('/api/inpatient/admissions'),
        apiRequest('/api/patients'),
        apiRequest('/api/doctors'),
      ]);

      if (wardRes.success) {
        setWards(wardRes.wards);
        if (wardRes.wards.length > 0 && !admitForm.wardId) {
          const firstWard = wardRes.wards[0];
          const availableBed = firstWard.beds?.find((b: any) => b.status === 'AVAILABLE');
          setAdmitForm((prev) => ({
            ...prev,
            wardId: firstWard.id,
            bedId: availableBed?.id || '',
          }));
        }
      }
      if (admRes.success) setAdmissions(admRes.admissions);
      if (patRes.success) {
        setPatients(patRes.data);
        if (patRes.data.length > 0 && !admitForm.patientId) {
          setAdmitForm((prev) => ({ ...prev, patientId: patRes.data[0].id }));
        }
      }
      if (docRes.success) {
        setDoctors(docRes.doctors);
        if (docRes.doctors.length > 0 && !admitForm.admittingDoctorId) {
          setAdmitForm((prev) => ({ ...prev, admittingDoctorId: docRes.doctors[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleWardChange = (wardId: string) => {
    const ward = wards.find((w) => w.id === wardId);
    const availableBed = ward?.beds?.find((b: any) => b.status === 'AVAILABLE');
    setAdmitForm({
      ...admitForm,
      wardId,
      bedId: availableBed?.id || '',
    });
  };

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admitForm.bedId) {
      alert('No available bed in the selected ward. Please select another ward or bed.');
      return;
    }

    try {
      await apiRequest('/api/inpatient/admissions', {
        method: 'POST',
        body: JSON.stringify(admitForm),
      });
      setIsAdmitOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Admission failed');
    }
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeTarget) return;

    try {
      await apiRequest('/api/inpatient/discharge', {
        method: 'POST',
        body: JSON.stringify({
          admissionId: dischargeTarget.id,
          dischargeSummary,
        }),
      });
      setDischargeTarget(null);
      setDischargeSummary('');
      fetchData();
      alert('Patient discharged and ward charges updated.');
    } catch (err: any) {
      alert(err.message || 'Discharge failed');
    }
  };

  const canAdmit = ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bed className="w-5 h-5 text-teal-600" />
            Inpatient Wards & Admission Care
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ward occupancy matrix, bed allocations, and inpatient admission lifecycle
          </p>
        </div>

        {canAdmit && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAdmitOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Admit Patient
          </Button>
        )}
      </div>

      {/* Wards Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {wards.map((w) => (
          <div key={w.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm text-slate-900">{w.name}</h3>
                <span className="text-[10px] font-mono text-slate-400">{w.code}</span>
              </div>
              <Badge variant={w.availableBeds > 0 ? 'success' : 'danger'} size="sm">
                {w.availableBeds} Available
              </Badge>
            </div>

            <div className="flex justify-between text-xs p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-500">Daily Rate:</span>
              <span className="font-bold text-teal-800">{w.dailyRateFormatted}</span>
            </div>

            {/* Mini Bed Status Dots */}
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Beds Status:</div>
              <div className="flex flex-wrap gap-1.5">
                {w.beds?.map((b: any) => (
                  <span
                    key={b.id}
                    title={`Bed ${b.bedNumber}: ${b.status}`}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      b.status === 'AVAILABLE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : b.status === 'OCCUPIED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {b.bedNumber}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Admissions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-800">
          Inpatient Admissions Records
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Admission #</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Ward & Bed</th>
                <th className="py-3 px-4">Doctor</th>
                <th className="py-3 px-4">Admission Date</th>
                <th className="py-3 px-4">Initial Diagnosis</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admissions.map((adm) => (
                <tr key={adm.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-teal-800">
                    {adm.admissionNumber}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    <div>{adm.patientName}</div>
                    <span className="text-[10px] text-slate-400 font-mono">{adm.patientIdNumber}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-800">
                    <div className="font-semibold">{adm.wardName}</div>
                    <span className="font-mono text-teal-700">Bed: {adm.bedNumber}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {adm.doctorName}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {formatSriLankanDate(adm.admissionDate)}
                  </td>
                  <td className="py-3 px-4 text-slate-800 max-w-xs truncate">
                    {adm.initialDiagnosis}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={adm.status === 'ADMITTED' ? 'info' : 'success'} size="sm">
                      {adm.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {adm.status === 'ADMITTED' && canAdmit && (
                      <button
                        onClick={() => {
                          setDischargeTarget(adm);
                          setDischargeSummary('');
                        }}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-semibold text-[11px] inline-flex items-center gap-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Discharge</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admit Patient Modal */}
      <Modal
        isOpen={isAdmitOpen}
        onClose={() => setIsAdmitOpen(false)}
        title="Inpatient Ward Admission"
        maxWidth="lg"
      >
        <form onSubmit={handleAdmit} className="space-y-4">
          <Select
            label="Patient *"
            value={admitForm.patientId}
            onChange={(e) => setAdmitForm({ ...admitForm, patientId: e.target.value })}
            options={patients.map((p) => ({
              label: `${p.fullName} (${p.patientId})`,
              value: p.id,
            }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Select Ward *"
              value={admitForm.wardId}
              onChange={(e) => handleWardChange(e.target.value)}
              options={wards.map((w) => ({
                label: `${w.name} (${w.availableBeds} beds free - ${w.dailyRateFormatted}/day)`,
                value: w.id,
              }))}
            />
            <Select
              label="Select Bed Number *"
              value={admitForm.bedId}
              onChange={(e) => setAdmitForm({ ...admitForm, bedId: e.target.value })}
              options={(wards.find((w) => w.id === admitForm.wardId)?.beds || [])
                .filter((b: any) => b.status === 'AVAILABLE')
                .map((b: any) => ({
                  label: `Bed ${b.bedNumber} (Available)`,
                  value: b.id,
                }))}
            />
          </div>

          <Select
            label="Admitting Consultant Doctor *"
            value={admitForm.admittingDoctorId}
            onChange={(e) => setAdmitForm({ ...admitForm, admittingDoctorId: e.target.value })}
            options={doctors.map((d) => ({
              label: `${d.fullName} (${d.specialization})`,
              value: d.id,
            }))}
          />

          <Input
            label="Initial Diagnosis / Reason for Admission *"
            value={admitForm.initialDiagnosis}
            onChange={(e) => setAdmitForm({ ...admitForm, initialDiagnosis: e.target.value })}
            placeholder="e.g. Acute Dengue with warning signs / Post-op recovery"
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAdmitOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm Admission
            </Button>
          </div>
        </form>
      </Modal>

      {/* Discharge Summary Modal */}
      {dischargeTarget && (
        <Modal
          isOpen={true}
          onClose={() => setDischargeTarget(null)}
          title={`Discharge Patient: ${dischargeTarget.patientName}`}
          maxWidth="md"
        >
          <form onSubmit={handleDischarge} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div>
                <span className="text-slate-500">Admission No: </span>
                <span className="font-mono font-bold text-slate-800">{dischargeTarget.admissionNumber}</span>
              </div>
              <div>
                <span className="text-slate-500">Admitted Date: </span>
                <span className="font-semibold text-slate-800">{formatSriLankanDate(dischargeTarget.admissionDate)}</span>
              </div>
              <div>
                <span className="text-slate-500">Daily Ward Charge: </span>
                <span className="font-semibold text-teal-800">{formatLKR(dischargeTarget.dailyChargeRate)}</span>
              </div>
            </div>

            <Input
              label="Discharge Summary & Medical Advice *"
              value={dischargeSummary}
              onChange={(e) => setDischargeSummary(e.target.value)}
              placeholder="e.g. Platelet count normalized to 180,000. Afebrile for 48 hours. Follow up in 1 week."
              required
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setDischargeTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Approve Discharge
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
