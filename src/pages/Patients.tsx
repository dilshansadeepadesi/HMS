import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { formatSriLankanDate, SRI_LANKA_PROVINCES } from '../utils/srilankan';
import { Users, Search, Plus, Eye, Edit3, Trash2, AlertCircle, Phone, FileText, CheckCircle2 } from 'lucide-react';

export const Patients: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit and Delete state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState<any | null>(null);

  // Patient Registration Form State
  const initialForm = {
    fullName: '',
    nic: '',
    passport: '',
    dateOfBirth: '',
    gender: 'MALE',
    bloodGroup: 'O+',
    phone: '',
    email: '',
    address: '',
    province: 'Western',
    district: 'Colombo',
    postalCode: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: 'Spouse',
    allergies: '',
    medicalAlerts: '',
  };

  const [form, setForm] = useState(initialForm);
  const [editForm, setEditForm] = useState(initialForm);

  const fetchPatients = async (query = '') => {
    try {
      setIsLoading(true);
      const res = await apiRequest(`/api/patients?search=${encodeURIComponent(query)}`);
      if (res.success) {
        setPatients(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients(search);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    // Debounce search
    const timer = setTimeout(() => {
      fetchPatients(val);
    }, 300);
    return () => clearTimeout(timer);
  };

  const handleProvinceChange = (province: string) => {
    const districts = SRI_LANKA_PROVINCES[province] || [];
    setForm({
      ...form,
      province,
      district: districts[0] || '',
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setFormError(null);

      const res = await apiRequest('/api/patients', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      if (res.success) {
        setIsRegisterOpen(false);
        setForm(initialForm);
        fetchPatients(search);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to register patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewPatientDetails = async (patientId: string) => {
    try {
      const res = await apiRequest(`/api/patients/${patientId}`);
      if (res.success) {
        setSelectedPatient(res);
        setIsDetailsOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEdit = (p: any) => {
    setEditingPatientId(p.id);
    setEditForm({
      fullName: p.fullName || '',
      nic: p.nic || '',
      passport: p.passport || '',
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '',
      gender: p.gender || 'MALE',
      bloodGroup: p.bloodGroup || 'O+',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      province: p.province || 'Western',
      district: p.district || 'Colombo',
      postalCode: p.postalCode || '',
      emergencyContactName: p.emergencyContactName || '',
      emergencyContactPhone: p.emergencyContactPhone || '',
      emergencyContactRelation: p.emergencyContactRelation || 'Spouse',
      allergies: p.allergies || '',
      medicalAlerts: p.medicalAlerts || '',
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleEditProvinceChange = (province: string) => {
    const districts = SRI_LANKA_PROVINCES[province] || [];
    setEditForm({
      ...editForm,
      province,
      district: districts[0] || '',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatientId) return;
    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await apiRequest(`/api/patients/${editingPatientId}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      if (res.success) {
        setIsEditOpen(false);
        fetchPatients(search);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to update patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (p: any) => {
    setDeletingPatient(p);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPatient) return;
    try {
      setIsSubmitting(true);
      const res = await apiRequest(`/api/patients/${deletingPatient.id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setIsDeleteOpen(false);
        setDeletingPatient(null);
        fetchPatients(search);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canRegister = ['ADMIN', 'RECEPTIONIST'].includes(user?.role || '');
  const canEdit = ['ADMIN', 'RECEPTIONIST'].includes(user?.role || '');
  const canDelete = ['ADMIN'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Header & Main Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            Patient Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sri Lankan patient registry with NIC validation and unique patient IDs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by ID, NIC, name..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {canRegister && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsRegisterOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Patient
            </Button>
          )}
        </div>
      </div>

      {/* 4 Explicit Options Panel requested by User */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => { if (canRegister) setIsRegisterOpen(true); }}
          className="p-3 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl text-left transition-all shadow-2xs group flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-teal-100/70 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Add Patient</div>
            <div className="text-[10px] text-slate-500">Register new patient profile</div>
          </div>
        </button>

        <div className="p-3 bg-white border border-slate-200 rounded-xl text-left shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-100/70 text-sky-700 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-900">Search Patient</div>
            <div className="text-[10px] text-slate-500">Filter by NIC, name, ID</div>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl text-left shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100/70 text-amber-700 flex items-center justify-center shrink-0">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Edit Patient</div>
            <div className="text-[10px] text-slate-500">Click Edit on any patient row</div>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl text-left shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-100/70 text-rose-700 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Delete Patient</div>
            <div className="text-[10px] text-slate-500">Click Delete on any patient row</div>
          </div>
        </div>
      </div>

      {/* Patient Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Patient ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">NIC / Passport</th>
                <th className="py-3 px-4">Gender / Age</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Province / District</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading patient records...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No matching patient records found.
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-teal-700">
                      {p.patientId}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>{p.fullName}</div>
                      {p.medicalAlerts && (
                        <span className="text-[10px] text-amber-600 font-normal">
                          Alert: {p.medicalAlerts}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {p.nic || p.passport || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="capitalize">{p.gender.toLowerCase()}</span> • {p.bloodGroup || 'O+'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {p.phone}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {p.district}, {p.province}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => viewPatientDetails(p.id)}
                        title="View Record"
                        className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors inline-flex items-center gap-1 font-medium text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      {canEdit && (
                        <button
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Patient"
                          className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors inline-flex items-center gap-1 font-medium text-[11px]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}

                      {canDelete && (
                        <button
                          onClick={() => handleOpenDelete(p)}
                          title="Delete Patient"
                          className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center gap-1 font-medium text-[11px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Patient Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Register New Patient (Sri Lanka)"
        maxWidth="2xl"
      >
        <form onSubmit={handleRegister} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="e.g. Kavinda Bandara Senanayake"
              required
            />
            <Input
              label="Sri Lankan NIC (9 digits+V or 12 digits)"
              value={form.nic}
              onChange={(e) => setForm({ ...form, nic: e.target.value })}
              placeholder="e.g. 883412589V or 199550341100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Date of Birth *"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              required
            />
            <Select
              label="Gender *"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              options={[
                { label: 'Male', value: 'MALE' },
                { label: 'Female', value: 'FEMALE' },
                { label: 'Other', value: 'OTHER' },
              ]}
            />
            <Select
              label="Blood Group"
              value={form.bloodGroup}
              onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
              options={[
                { label: 'A Positive (A+)', value: 'A+' },
                { label: 'A Negative (A-)', value: 'A-' },
                { label: 'B Positive (B+)', value: 'B+' },
                { label: 'B Negative (B-)', value: 'B-' },
                { label: 'O Positive (O+)', value: 'O+' },
                { label: 'O Negative (O-)', value: 'O-' },
                { label: 'AB Positive (AB+)', value: 'AB+' },
                { label: 'AB Negative (AB-)', value: 'AB-' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone Number (+94 or 07X) *"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0771234567 or +94 77 123 4567"
              required
            />
            <Input
              label="Email Address (Optional)"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="patient@gmail.com"
            />
          </div>

          <Input
            label="Residential Address *"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="No. 45/2, Temple Road, Nugegoda"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Province *"
              value={form.province}
              onChange={(e) => handleProvinceChange(e.target.value)}
              options={Object.keys(SRI_LANKA_PROVINCES).map((p) => ({ label: p, value: p }))}
            />
            <Select
              label="District *"
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              options={(SRI_LANKA_PROVINCES[form.province] || []).map((d) => ({ label: d, value: d }))}
            />
            <Input
              label="Postal Code"
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              placeholder="e.g. 10250"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Emergency Contact Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                label="Contact Name *"
                value={form.emergencyContactName}
                onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                placeholder="e.g. Anoma Senanayake"
                required
              />
              <Input
                label="Emergency Phone *"
                value={form.emergencyContactPhone}
                onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                placeholder="0718765432"
                required
              />
              <Input
                label="Relationship *"
                value={form.emergencyContactRelation}
                onChange={(e) => setForm({ ...form, emergencyContactRelation: e.target.value })}
                placeholder="Spouse / Parent / Sibling"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Known Allergies"
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              placeholder="e.g. Penicillin, NSAIDs, Sulfa"
            />
            <Input
              label="Medical Alerts / Chronic Conditions"
              value={form.medicalAlerts}
              onChange={(e) => setForm({ ...form, medicalAlerts: e.target.value })}
              placeholder="e.g. Asthmatic, Diabetic, Hypertension"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Complete Registration
            </Button>
          </div>
        </form>
      </Modal>

      {/* Patient Details & Clinical History Modal */}
      {selectedPatient && (
        <Modal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title={`Patient Record: ${selectedPatient.patient.patientId}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Demographic Profile */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedPatient.patient.fullName}</h3>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    NIC: {selectedPatient.patient.nic || selectedPatient.patient.passport || 'N/A'} • DOB: {formatSriLankanDate(selectedPatient.patient.dateOfBirth)}
                  </div>
                </div>
                <Badge variant="purple" size="md">
                  Blood Group: {selectedPatient.patient.bloodGroup || 'N/A'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Phone:</span>
                  <span className="font-semibold text-slate-800">{selectedPatient.patient.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">District:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedPatient.patient.district}, {selectedPatient.patient.province}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Emergency Contact:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedPatient.patient.emergencyContactName} ({selectedPatient.patient.emergencyContactPhone})
                  </span>
                </div>
              </div>

              {(selectedPatient.patient.allergies || selectedPatient.patient.medicalAlerts) && (
                <div className="mt-3 pt-3 border-t border-slate-200 text-xs flex gap-4">
                  {selectedPatient.patient.allergies && (
                    <div className="text-rose-700">
                      <span className="font-bold">Allergies:</span> {selectedPatient.patient.allergies}
                    </div>
                  )}
                  {selectedPatient.patient.medicalAlerts && (
                    <div className="text-amber-800">
                      <span className="font-bold">Alerts:</span> {selectedPatient.patient.medicalAlerts}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Medical History Section (Subject to RBAC permission) */}
            {selectedPatient.canViewClinical ? (
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Clinical History & Medical Records
                </h4>

                {selectedPatient.medicalRecords.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                    No clinical visit records found for this patient.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedPatient.medicalRecords.map((mr: any) => (
                      <div key={mr.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                        <div className="flex justify-between items-center text-slate-500 pb-1 border-b border-slate-100">
                          <span className="font-semibold text-slate-800">Consultant: {mr.doctorName}</span>
                          <span>{formatSriLankanDate(mr.visitDate)}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-700">Chief Complaint:</span> {mr.chiefComplaint}
                        </div>
                        <div className="p-2 bg-teal-50/60 rounded border border-teal-100">
                          <span className="font-bold text-teal-900">Diagnosis:</span> {mr.diagnosis} {mr.icdCode && `(${mr.icdCode})`}
                        </div>
                        {mr.treatmentPlan && (
                          <div>
                            <span className="font-bold text-slate-700">Treatment Plan:</span> {mr.treatmentPlan}
                          </div>
                        )}
                        {mr.vitalsSystolic && (
                          <div className="text-[11px] text-slate-500 flex gap-3 pt-1">
                            <span>BP: {mr.vitalsSystolic}/{mr.vitalsDiastolic} mmHg</span>
                            <span>Pulse: {mr.vitalsPulse} bpm</span>
                            <span>SpO2: {mr.vitalsSpo2}%</span>
                            <span>Temp: {mr.vitalsTemp}°C</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 italic">
                Clinical medical records are restricted to Doctors, Nurses, and Medical Administrators under confidentiality guidelines.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Edit Patient Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Patient Details"
        maxWidth="2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              required
            />
            <Input
              label="Sri Lankan NIC"
              value={editForm.nic}
              onChange={(e) => setEditForm({ ...editForm, nic: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Date of Birth *"
              type="date"
              value={editForm.dateOfBirth}
              onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
              required
            />
            <Select
              label="Gender *"
              value={editForm.gender}
              onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
              options={[
                { label: 'Male', value: 'MALE' },
                { label: 'Female', value: 'FEMALE' },
                { label: 'Other', value: 'OTHER' },
              ]}
            />
            <Select
              label="Blood Group"
              value={editForm.bloodGroup}
              onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
              options={[
                { label: 'A Positive (A+)', value: 'A+' },
                { label: 'A Negative (A-)', value: 'A-' },
                { label: 'B Positive (B+)', value: 'B+' },
                { label: 'B Negative (B-)', value: 'B-' },
                { label: 'O Positive (O+)', value: 'O+' },
                { label: 'O Negative (O-)', value: 'O-' },
                { label: 'AB Positive (AB+)', value: 'AB+' },
                { label: 'AB Negative (AB-)', value: 'AB-' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone Number *"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              required
            />
            <Input
              label="Email Address"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </div>

          <Input
            label="Residential Address *"
            value={editForm.address}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Province *"
              value={editForm.province}
              onChange={(e) => handleEditProvinceChange(e.target.value)}
              options={Object.keys(SRI_LANKA_PROVINCES).map((p) => ({ label: p, value: p }))}
            />
            <Select
              label="District *"
              value={editForm.district}
              onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
              options={(SRI_LANKA_PROVINCES[editForm.province] || []).map((d) => ({ label: d, value: d }))}
            />
            <Input
              label="Postal Code"
              value={editForm.postalCode}
              onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Emergency Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                label="Contact Name *"
                value={editForm.emergencyContactName}
                onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                required
              />
              <Input
                label="Emergency Phone *"
                value={editForm.emergencyContactPhone}
                onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                required
              />
              <Input
                label="Relationship *"
                value={editForm.emergencyContactRelation}
                onChange={(e) => setEditForm({ ...editForm, emergencyContactRelation: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Known Allergies"
              value={editForm.allergies}
              onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
            />
            <Input
              label="Medical Alerts"
              value={editForm.medicalAlerts}
              onChange={(e) => setEditForm({ ...editForm, medicalAlerts: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Patient Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Delete Patient Record"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Are you sure you want to delete this patient?</p>
              <p className="mt-1 text-slate-600">
                This will remove the patient profile for <span className="font-bold text-slate-900">{deletingPatient?.fullName}</span> ({deletingPatient?.patientId}). This action is logged in the system audit trail.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={isSubmitting}
              onClick={handleConfirmDelete}
            >
              Delete Patient
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
