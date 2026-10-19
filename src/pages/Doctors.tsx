import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { formatLKR } from '../utils/srilankan';
import { Stethoscope, Building2, Award, Clock, Plus, Search, Trash2, AlertCircle } from 'lucide-react';

export const Doctors: React.FC = () => {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Doctor Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const initialForm = {
    fullName: '',
    email: '',
    username: '',
    password: 'DoctorPass123!',
    slmcRegNo: '',
    specialization: 'General Physician',
    qualification: 'MBBS, MD',
    consultationFee: 2500,
    departmentId: '',
    roomNumber: 'Room 101, Consultation Wing',
    availableDays: 'Monday, Tuesday, Wednesday, Thursday, Friday',
  };
  const [form, setForm] = useState(initialForm);

  // Delete Doctor Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingDoctor, setDeletingDoctor] = useState<any | null>(null);

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      const [docRes, deptRes] = await Promise.all([
        apiRequest('/api/doctors'),
        apiRequest('/api/doctors/departments'),
      ]);
      if (docRes.success) setDoctors(docRes.doctors);
      if (deptRes.success) {
        setDepartments(deptRes.departments);
        if (deptRes.departments.length > 0 && !form.departmentId) {
          setForm((prev) => ({ ...prev, departmentId: deptRes.departments[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    // Real-time synchronization every 3 seconds
    const interval = setInterval(() => {
      fetchData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await apiRequest('/api/doctors', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          consultationFee: parseFloat(String(form.consultationFee)) || 2500,
        }),
      });

      if (res.success) {
        setIsAddOpen(false);
        setForm(initialForm);
        fetchData(false);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to add doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (doc: any) => {
    setDeletingDoctor(doc);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingDoctor) return;
    try {
      setIsSubmitting(true);
      const res = await apiRequest(`/api/doctors/${deletingDoctor.id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setIsDeleteOpen(false);
        setDeletingDoctor(null);
        fetchData(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.fullName?.toLowerCase().includes(q) ||
      doc.specialization?.toLowerCase().includes(q) ||
      doc.slmcRegNo?.toLowerCase().includes(q) ||
      doc.departmentName?.toLowerCase().includes(q) ||
      doc.qualification?.toLowerCase().includes(q)
    );
  });

  const canManage = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              Medical Staff & Clinical Departments
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Real-Time Sync</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Sri Lanka Medical Council (SLMC) certified consultants, specialists, and clinic schedules
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Doctor
            </Button>
          )}
        </div>
      </div>

      {/* 3 Explicit Options Panel requested by User */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => { if (canManage) setIsAddOpen(true); }}
          className="p-3 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl text-left transition-all shadow-2xs group flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-teal-100/70 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">1. Add Doctor</div>
            <div className="text-[10px] text-slate-500">Register new consultant physician</div>
          </div>
        </button>

        <div className="p-3 bg-white border border-slate-200 rounded-xl text-left shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-100/70 text-sky-700 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-900">2. Search Doctors</div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, specialization, SLMC..."
              className="mt-1 w-full px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl text-left shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-100/70 text-rose-700 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">3. Delete Doctor</div>
            <div className="text-[10px] text-slate-500">Click Delete on any doctor card</div>
          </div>
        </div>
      </div>

      {/* Departments Grid */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Hospital Clinical Departments ({departments.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div key={dept.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">{dept.name}</h3>
                  <span className="text-[10px] font-mono font-semibold text-slate-400">{dept.code}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                {dept.description || 'Specialized clinical care and patient consultations.'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Doctor Profiles */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Consultant Doctors & Physicians ({filteredDoctors.length})
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">
            Auto-refreshing live data
          </span>
        </div>

        {filteredDoctors.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            {searchQuery ? `No doctors match search "${searchQuery}".` : 'No doctors registered.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDoctors.map((doc) => (
              <div key={doc.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">{doc.fullName}</h3>
                      <div className="text-xs text-teal-700 font-semibold">{doc.specialization}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900">{formatLKR(doc.consultationFee)}</span>
                      <span className="text-[10px] text-slate-400 block">Consultation Fee</span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      <span>{doc.qualification}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">SLMC Reg:</span>
                      <span>{doc.slmcRegNo}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Clinic Days: {doc.availableDays}</span>
                    </div>
                    {doc.roomNumber && (
                      <div className="text-[11px] text-slate-500">
                        Location: {doc.roomNumber}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Dept: {doc.departmentName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-600 flex items-center gap-1 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      On Duty
                    </span>
                    {canManage && (
                      <button
                        onClick={() => handleOpenDelete(doc)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete Doctor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Doctor Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register Consultant Doctor (SLMC Certified)"
        maxWidth="lg"
      >
        <form onSubmit={handleAddDoctor} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Doctor Full Name *"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="e.g. Dr. Rohan Gunawardena"
              required
            />
            <Input
              label="SLMC Registration Number *"
              value={form.slmcRegNo}
              onChange={(e) => setForm({ ...form, slmcRegNo: e.target.value })}
              placeholder="e.g. SLMC-41295"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email Address *"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="doctor@mediplus.lk"
              required
            />
            <Input
              label="System Username *"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="dr.rohan"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Specialization *"
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              placeholder="e.g. Consultant Cardiologist"
              required
            />
            <Input
              label="Qualifications *"
              value={form.qualification}
              onChange={(e) => setForm({ ...form, qualification: e.target.value })}
              placeholder="MBBS, MD, MRCP (UK)"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Assigned Department *"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              options={departments.map((d) => ({ label: `${d.name} (${d.code})`, value: d.id }))}
            />
            <Input
              label="Consultation Fee (LKR) *"
              type="number"
              value={form.consultationFee}
              onChange={(e) => setForm({ ...form, consultationFee: Number(e.target.value) })}
              required
            />
          </div>

          <Input
            label="Clinic Room / Location"
            value={form.roomNumber}
            onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
            placeholder="Room 105, Level 2"
          />

          <Input
            label="Available Clinic Days"
            value={form.availableDays}
            onChange={(e) => setForm({ ...form, availableDays: e.target.value })}
            placeholder="Monday, Wednesday, Friday"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Register Doctor
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Doctor Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Delete Doctor Profile"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Are you sure you want to remove this doctor?</p>
              <p className="mt-1 text-slate-600">
                This will delete the profile for <span className="font-bold text-slate-900">{deletingDoctor?.fullName}</span> ({deletingDoctor?.specialization} - SLMC: {deletingDoctor?.slmcRegNo}). This action will be logged in the system audit trail.
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
              Delete Doctor
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
