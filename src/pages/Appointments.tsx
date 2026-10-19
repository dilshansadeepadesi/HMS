import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Select, Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { formatSriLankanDate, formatLKR } from '../utils/srilankan';
import { Calendar, Plus, Clock, User, CheckCircle2, XCircle, AlertCircle, Search, Edit3, Trash2 } from 'lucide-react';

export const Appointments: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter and search state
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit and Delete state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    appointmentDate: '',
    slotTime: '09:00 AM',
    type: 'CONSULTATION',
    notes: '',
    doctorId: '',
  });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingAppointment, setDeletingAppointment] = useState<any | null>(null);

  // Booking Form State
  const [form, setForm] = useState({
    patientId: '',
    doctorId: '',
    departmentId: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    slotTime: '09:00 AM',
    type: 'CONSULTATION',
    notes: '',
  });

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      const [aptRes, docRes, patRes, deptRes] = await Promise.all([
        apiRequest(`/api/appointments?date=${filterDate}`),
        apiRequest('/api/doctors'),
        apiRequest('/api/patients'),
        apiRequest('/api/doctors/departments'),
      ]);

      if (aptRes.success) setAppointments(aptRes.appointments);
      if (docRes.success) setDoctors(docRes.doctors);
      if (patRes.success) setPatients(patRes.data);
      if (deptRes.success) setDepartments(deptRes.departments);

      if (docRes.doctors?.length > 0 && !form.doctorId) {
        setForm((prev) => ({
          ...prev,
          doctorId: docRes.doctors[0].id,
          departmentId: docRes.doctors[0].departmentId,
        }));
      }
      if (patRes.data?.length > 0 && !form.patientId) {
        setForm((prev) => ({ ...prev, patientId: patRes.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    // Real-time live synchronization every 3 seconds
    const timer = setInterval(() => {
      fetchData(true);
    }, 3000);
    return () => clearInterval(timer);
  }, [filterDate]);

  const handleDoctorChange = (doctorId: string) => {
    const selectedDoc = doctors.find((d) => d.id === doctorId);
    setForm({
      ...form,
      doctorId,
      departmentId: selectedDoc?.departmentId || form.departmentId,
    });
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setFormError(null);

      const res = await apiRequest('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      if (res.success) {
        setIsBookOpen(false);
        fetchData();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to book appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (appointmentId: string, status: string) => {
    try {
      await apiRequest(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    const reason = prompt('Please enter cancellation reason:');
    if (!reason) return;

    try {
      await apiRequest(`/api/appointments/${appointmentId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'ARRIVED': return 'info';
      case 'IN_CONSULTATION': return 'purple';
      case 'SCHEDULED': return 'warning';
      case 'CANCELLED': return 'danger';
      default: return 'neutral';
    }
  };

  const handleOpenEdit = (apt: any) => {
    setEditingAppointment(apt);
    setEditForm({
      appointmentDate: apt.appointmentDate ? apt.appointmentDate.split('T')[0] : filterDate,
      slotTime: apt.slotTime || '09:00 AM',
      type: apt.type || 'CONSULTATION',
      notes: apt.notes || '',
      doctorId: apt.doctorId || '',
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;
    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await apiRequest(`/api/appointments/${editingAppointment.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      if (res.success) {
        setIsEditOpen(false);
        fetchData(false);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to update appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (apt: any) => {
    setDeletingAppointment(apt);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAppointment) return;
    try {
      setIsSubmitting(true);
      const res = await apiRequest(`/api/appointments/${deletingAppointment.id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setIsDeleteOpen(false);
        setDeletingAppointment(null);
        fetchData(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      apt.appointmentNumber?.toLowerCase().includes(q) ||
      apt.patientName?.toLowerCase().includes(q) ||
      apt.doctorName?.toLowerCase().includes(q) ||
      apt.patientIdNumber?.toLowerCase().includes(q) ||
      String(apt.queueNumber).includes(q)
    );
  });

  const canBook = ['ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(user?.role || '');
  const canEdit = ['ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(user?.role || '');
  const canDelete = ['ADMIN', 'RECEPTIONIST'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              Appointment Management
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Real-Time Sync</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Clinic schedules, outpatient queues, and real-time conflict-free booking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          />

          {canBook && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsBookOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Appointment
            </Button>
          )}
        </div>
      </div>

      {/* 4 Explicit Options Panel requested by User */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => { if (canBook) setIsBookOpen(true); }}
          className="p-3 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl text-left transition-all shadow-2xs group flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-teal-100/70 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">1. Add Appointment</div>
            <div className="text-[10px] text-slate-500">Book new clinic session</div>
          </div>
        </button>

        <div className="p-3 bg-white border border-slate-200 rounded-xl text-left shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-100/70 text-sky-700 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-900">2. Search Appointments</div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name, ID, queue..."
              className="mt-1 w-full px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl text-left shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100/70 text-amber-700 flex items-center justify-center shrink-0">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">3. Edit Appointment</div>
            <div className="text-[10px] text-slate-500">Modify slot time or doctor</div>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl text-left shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-100/70 text-rose-700 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">4. Delete Appointment</div>
            <div className="text-[10px] text-slate-500">Remove booked appointment</div>
          </div>
        </div>
      </div>

      {/* Appointment Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-xs text-slate-800">
            Live Booking List ({filteredAppointments.length} Appointments on {formatSriLankanDate(filterDate)})
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Auto-refreshing every 3s
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Queue #</th>
                <th className="py-3 px-4">Appointment ID</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Doctor & Department</th>
                <th className="py-3 px-4">Time Slot</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading appointments...
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {searchQuery
                      ? `No appointments match "${searchQuery}".`
                      : `No appointments scheduled for ${formatSriLankanDate(filterDate)}.`}
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-teal-800 text-sm">
                      #{apt.queueNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {apt.appointmentNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>{apt.patientName}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{apt.patientIdNumber}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="font-semibold">{apt.doctorName}</div>
                      <span className="text-[11px] text-slate-500">{apt.departmentName}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {apt.slotTime}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getStatusBadgeVariant(apt.status)} size="sm">
                        {apt.status}
                      </Badge>
                      {apt.cancellationReason && (
                        <div className="text-[10px] text-rose-600 mt-0.5">
                          Reason: {apt.cancellationReason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      {apt.status === 'SCHEDULED' && (
                        <button
                          onClick={() => updateStatus(apt.id, 'ARRIVED')}
                          className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded text-[11px] font-semibold"
                        >
                          Mark Arrived
                        </button>
                      )}
                      {apt.status === 'ARRIVED' && (
                        <button
                          onClick={() => updateStatus(apt.id, 'IN_CONSULTATION')}
                          className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-[11px] font-semibold"
                        >
                          In Consultation
                        </button>
                      )}

                      {canEdit && (
                        <button
                          onClick={() => handleOpenEdit(apt)}
                          title="Edit Appointment"
                          className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}

                      {canDelete && (
                        <button
                          onClick={() => handleOpenDelete(apt)}
                          title="Delete Appointment"
                          className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
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

      {/* Book Appointment Modal */}
      <Modal
        isOpen={isBookOpen}
        onClose={() => setIsBookOpen(false)}
        title="Book Doctor Appointment"
        maxWidth="lg"
      >
        <form onSubmit={handleBook} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Select
            label="Select Patient *"
            value={form.patientId}
            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
            options={patients.map((p) => ({
              label: `${p.fullName} (${p.patientId} - ${p.nic || p.phone})`,
              value: p.id,
            }))}
          />

          <Select
            label="Select Consultant Doctor *"
            value={form.doctorId}
            onChange={(e) => handleDoctorChange(e.target.value)}
            options={doctors.map((d) => ({
              label: `${d.fullName} (${d.specialization} - Fee: ${formatLKR(d.consultationFee)})`,
              value: d.id,
            }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Appointment Date *"
              type="date"
              value={form.appointmentDate}
              onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
              required
            />
            <Select
              label="Time Slot *"
              value={form.slotTime}
              onChange={(e) => setForm({ ...form, slotTime: e.target.value })}
              options={[
                { label: '08:30 AM', value: '08:30 AM' },
                { label: '09:00 AM', value: '09:00 AM' },
                { label: '09:30 AM', value: '09:30 AM' },
                { label: '10:00 AM', value: '10:00 AM' },
                { label: '10:30 AM', value: '10:30 AM' },
                { label: '11:00 AM', value: '11:00 AM' },
                { label: '04:30 PM', value: '04:30 PM' },
                { label: '05:00 PM', value: '05:00 PM' },
                { label: '05:30 PM', value: '05:30 PM' },
                { label: '06:00 PM', value: '06:00 PM' },
                { label: '06:30 PM', value: '06:30 PM' },
                { label: '07:00 PM', value: '07:00 PM' },
              ]}
            />
          </div>

          <Select
            label="Appointment Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={[
              { label: 'Specialist Consultation', value: 'CONSULTATION' },
              { label: 'Follow Up Visit', value: 'FOLLOW_UP' },
              { label: 'General OPD', value: 'OPD' },
              { label: 'Emergency', value: 'EMERGENCY' },
            ]}
          />

          <Input
            label="Notes / Reason for Visit"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="e.g. Fever and joint ache for 3 days"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsBookOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Confirm Booking
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Appointment: ${editingAppointment?.appointmentNumber || ''}`}
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
            <div className="font-semibold text-slate-900">{editingAppointment?.patientName}</div>
            <div className="text-[11px] text-slate-500">Patient ID: {editingAppointment?.patientIdNumber} • Queue #{editingAppointment?.queueNumber}</div>
          </div>

          <Select
            label="Consultant Doctor"
            value={editForm.doctorId}
            onChange={(e) => setEditForm({ ...editForm, doctorId: e.target.value })}
            options={doctors.map((d) => ({
              label: `${d.fullName} (${d.specialization})`,
              value: d.id,
            }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Appointment Date *"
              type="date"
              value={editForm.appointmentDate}
              onChange={(e) => setEditForm({ ...editForm, appointmentDate: e.target.value })}
              required
            />
            <Select
              label="Time Slot *"
              value={editForm.slotTime}
              onChange={(e) => setEditForm({ ...editForm, slotTime: e.target.value })}
              options={[
                { label: '08:30 AM', value: '08:30 AM' },
                { label: '09:00 AM', value: '09:00 AM' },
                { label: '09:30 AM', value: '09:30 AM' },
                { label: '10:00 AM', value: '10:00 AM' },
                { label: '10:30 AM', value: '10:30 AM' },
                { label: '11:00 AM', value: '11:00 AM' },
                { label: '04:30 PM', value: '04:30 PM' },
                { label: '05:00 PM', value: '05:00 PM' },
                { label: '05:30 PM', value: '05:30 PM' },
                { label: '06:00 PM', value: '06:00 PM' },
                { label: '06:30 PM', value: '06:30 PM' },
                { label: '07:00 PM', value: '07:00 PM' },
              ]}
            />
          </div>

          <Select
            label="Appointment Type"
            value={editForm.type}
            onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
            options={[
              { label: 'Specialist Consultation', value: 'CONSULTATION' },
              { label: 'Follow Up Visit', value: 'FOLLOW_UP' },
              { label: 'General OPD', value: 'OPD' },
              { label: 'Emergency', value: 'EMERGENCY' },
            ]}
          />

          <Input
            label="Notes / Reason for Visit"
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Update Appointment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Appointment Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Delete Appointment"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Are you sure you want to delete this appointment booking?</p>
              <p className="mt-1 text-slate-600">
                This will delete booking <span className="font-bold text-slate-900">{deletingAppointment?.appointmentNumber}</span> for patient <span className="font-bold text-slate-900">{deletingAppointment?.patientName}</span> with <span className="font-bold text-slate-900">{deletingAppointment?.doctorName}</span>.
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
              onClick={handleDeleteConfirm}
            >
              Delete Appointment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
