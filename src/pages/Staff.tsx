import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { formatSriLankanDate, formatLKR } from '../utils/srilankan';
import {
  UserCheck,
  Clock,
  Users,
  Building,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckSquare,
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

export const Staff: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'directory' | 'tasks' | 'attendance'>('directory');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Add Staff Modal
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const initialStaffForm = {
    fullName: '',
    nic: '',
    designation: 'Nursing Officer',
    departmentId: '',
    salaryLkr: 65000,
    phone: '',
    email: '',
    employmentType: 'PERMANENT',
  };
  const [staffForm, setStaffForm] = useState(initialStaffForm);

  // Edit Staff Modal
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [editStaffForm, setEditStaffForm] = useState(initialStaffForm);

  // Delete Staff Modal
  const [isDeleteStaffOpen, setIsDeleteStaffOpen] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<any | null>(null);

  // Assign Task Modal
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const initialTaskForm = {
    employeeId: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    shift: 'MORNING',
    dueDate: new Date().toISOString().split('T')[0],
  };
  const [taskForm, setTaskForm] = useState(initialTaskForm);

  // Attendance Form
  const [punchEmployeeId, setPunchEmployeeId] = useState('');
  const [punchTime, setPunchTime] = useState('08:00 AM');
  const [punchStatus, setPunchStatus] = useState('PRESENT');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [empRes, deptRes, attRes, taskRes] = await Promise.all([
        apiRequest('/api/staff/employees'),
        apiRequest('/api/doctors/departments'),
        apiRequest(`/api/staff/attendance?date=${selectedDate}`),
        apiRequest('/api/staff/tasks'),
      ]);

      if (empRes.success) {
        setEmployees(empRes.employees);
        if (empRes.employees.length > 0) {
          if (!punchEmployeeId) setPunchEmployeeId(empRes.employees[0].id);
          if (!taskForm.employeeId) setTaskForm((prev) => ({ ...prev, employeeId: empRes.employees[0].id }));
        }
      }
      if (deptRes.success) {
        setDepartments(deptRes.departments);
        if (deptRes.departments.length > 0 && !staffForm.departmentId) {
          setStaffForm((prev) => ({ ...prev, departmentId: deptRes.departments[0].id }));
        }
      }
      if (attRes.success) setAttendance(attRes.attendance);
      if (taskRes.success) setTasks(taskRes.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  // Add Staff
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await apiRequest('/api/staff/employees', {
        method: 'POST',
        body: JSON.stringify(staffForm),
      });
      if (res.success) {
        setIsAddStaffOpen(false);
        setStaffForm(initialStaffForm);
        fetchData();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to add staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Staff
  const handleOpenEdit = (emp: any) => {
    setEditingEmployee(emp);
    setEditStaffForm({
      fullName: emp.fullName || '',
      nic: emp.nic || '',
      designation: emp.designation || '',
      departmentId: emp.departmentId || '',
      salaryLkr: emp.salaryLkr || 50000,
      phone: emp.phone || '',
      email: emp.email || '',
      employmentType: emp.employmentType || 'PERMANENT',
    });
    setFormError(null);
    setIsEditStaffOpen(true);
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await apiRequest(`/api/staff/employees/${editingEmployee.id}`, {
        method: 'PUT',
        body: JSON.stringify(editStaffForm),
      });
      if (res.success) {
        setIsEditStaffOpen(false);
        fetchData();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to update staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Staff
  const handleOpenDelete = (emp: any) => {
    setDeletingEmployee(emp);
    setIsDeleteStaffOpen(true);
  };

  const handleDeleteStaff = async () => {
    if (!deletingEmployee) return;
    try {
      setIsSubmitting(true);
      const res = await apiRequest(`/api/staff/employees/${deletingEmployee.id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setIsDeleteStaffOpen(false);
        setDeletingEmployee(null);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Assign Task
  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await apiRequest('/api/staff/tasks', {
        method: 'POST',
        body: JSON.stringify(taskForm),
      });
      if (res.success) {
        setIsAssignTaskOpen(false);
        setTaskForm(initialTaskForm);
        fetchData();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to assign task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Task Status
  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      await apiRequest(`/api/staff/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update task status');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await apiRequest(`/api/staff/tasks/${taskId}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  // Attendance Punch
  const handlePunch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/staff/attendance', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: punchEmployeeId,
          date: selectedDate,
          checkInTime: punchTime,
          status: punchStatus,
        }),
      });
      fetchData();
      alert('Attendance recorded.');
    } catch (err: any) {
      alert(err.message || 'Failed to record attendance');
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      emp.fullName?.toLowerCase().includes(q) ||
      emp.employeeNumber?.toLowerCase().includes(q) ||
      emp.nic?.toLowerCase().includes(q) ||
      emp.designation?.toLowerCase().includes(q) ||
      emp.departmentName?.toLowerCase().includes(q)
    );
  });

  const canManage = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-teal-600" />
            Hospital Staff & Human Resources
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Healthcare workforce directory, duties & task assignments, and shift attendance tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddStaffOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Staff
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAssignTaskOpen(true)}
            icon={<CheckSquare className="w-4 h-4 text-teal-600" />}
          >
            Assign Task
          </Button>
        </div>
      </div>

      {/* 5 Explicit Options Panel requested by User */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => { if (canManage) setIsAddStaffOpen(true); }}
          className="p-3 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl text-left transition-all shadow-2xs group flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-teal-100/70 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">1. Add Staff</div>
            <div className="text-[10px] text-slate-500">New employee</div>
          </div>
        </button>

        <div className="p-3 bg-white border border-slate-200 rounded-xl text-left shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-100/70 text-sky-700 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-900">2. Search Staff</div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, NIC, role..."
              className="mt-1 w-full px-2 py-0.5 text-[11px] bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl text-left shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100/70 text-amber-700 flex items-center justify-center shrink-0">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">3. Edit Staff</div>
            <div className="text-[10px] text-slate-500">Row edit action</div>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl text-left shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-100/70 text-rose-700 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">4. Delete Staff</div>
            <div className="text-[10px] text-slate-500">Row delete action</div>
          </div>
        </div>

        <button
          onClick={() => setIsAssignTaskOpen(true)}
          className="p-3 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl text-left transition-all shadow-2xs group flex items-center gap-3 col-span-2 md:col-span-1"
        >
          <div className="w-9 h-9 rounded-lg bg-purple-100/70 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">5. Assign Task</div>
            <div className="text-[10px] text-slate-500">Assign duty / shift</div>
          </div>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'directory'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Directory ({filteredEmployees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'tasks'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Assigned Staff Tasks ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'attendance'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Daily Attendance Log</span>
        </button>
      </div>

      {/* Tab 1: Staff Members Directory */}
      {activeTab === 'directory' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">
              Hospital Employees List ({filteredEmployees.length} registered)
            </span>
            {searchQuery && (
              <span className="text-xs text-slate-400">
                Filtered by "{searchQuery}"
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">NIC</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Salary (LKR)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading staff records...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      {searchQuery ? `No employees match "${searchQuery}".` : 'No staff members registered.'}
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal-800">
                        {emp.employeeNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div>{emp.fullName}</div>
                        <span className="text-[10px] text-slate-400">{emp.phone}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {emp.nic}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {emp.designation}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {emp.departmentName}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="neutral" size="sm">
                          {emp.employmentType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {emp.salaryFormatted}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(emp)}
                              title="Edit Staff Member"
                              className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors inline-flex items-center gap-1 font-medium text-[11px]"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleOpenDelete(emp)}
                              title="Delete Staff Member"
                              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center gap-1 font-medium text-[11px]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Assigned Staff Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Staff Duty & Task Assignments</h3>
                <p className="text-xs text-slate-500">Track task completion status, shifts, and assigned healthcare duties</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAssignTaskOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Assign New Task
              </Button>
            </div>

            <div className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No duties or tasks currently assigned. Click "Assign New Task" to delegate duties.
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{task.title}</span>
                        <Badge
                          variant={
                            task.status === 'COMPLETED'
                              ? 'success'
                              : task.status === 'IN_PROGRESS'
                              ? 'purple'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {task.status.replace('_', ' ')}
                        </Badge>
                        <Badge
                          variant={
                            task.priority === 'URGENT'
                              ? 'danger'
                              : task.priority === 'HIGH'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {task.priority} Priority
                        </Badge>
                      </div>

                      {task.description && (
                        <p className="text-slate-600">{task.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                        <span>Assigned to: <strong className="text-slate-700">{task.employeeName}</strong> ({task.designation})</span>
                        <span>• Shift: <strong className="text-slate-700">{task.shift}</strong></span>
                        <span>• Due Date: <strong>{formatSriLankanDate(task.dueDate)}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleUpdateTaskStatus(task.id, 'IN_PROGRESS')}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded text-[11px]"
                        >
                          Start Task
                        </button>
                      )}
                      {task.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleUpdateTaskStatus(task.id, 'COMPLETED')}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded text-[11px]"
                        >
                          Mark Done
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Attendance Log */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              Mark Daily Duty Attendance
            </h3>
            <form onSubmit={handlePunch} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <Select
                label="Staff Member"
                value={punchEmployeeId}
                onChange={(e) => setPunchEmployeeId(e.target.value)}
                options={employees.map((e) => ({
                  label: `${e.fullName} (${e.designation})`,
                  value: e.id,
                }))}
              />
              <Input
                label="Check-in Time"
                value={punchTime}
                onChange={(e) => setPunchTime(e.target.value)}
                placeholder="e.g. 07:55 AM"
              />
              <Select
                label="Attendance Status"
                value={punchStatus}
                onChange={(e) => setPunchStatus(e.target.value)}
                options={[
                  { label: 'Present (On Duty)', value: 'PRESENT' },
                  { label: 'Late Shift Check-in', value: 'LATE' },
                  { label: 'Half Day', value: 'HALF_DAY' },
                  { label: 'On Approved Leave', value: 'ON_LEAVE' },
                  { label: 'Absent', value: 'ABSENT' },
                ]}
              />
              <Button type="submit" variant="primary" size="md">
                Log Attendance
              </Button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800">
                Attendance Records for {formatSriLankanDate(selectedDate)} ({attendance.length})
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              />
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {attendance.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  No attendance records recorded for {formatSriLankanDate(selectedDate)}.
                </div>
              ) : (
                attendance.map((att) => (
                  <div key={att.id} className="p-3.5 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{att.employeeName}</div>
                      <div className="text-[11px] text-slate-500">{att.departmentName} • Shift: {att.shift || 'General'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-600">In: {att.checkInTime}</span>
                      <Badge variant={att.status === 'PRESENT' ? 'success' : 'warning'} size="sm">
                        {att.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Member Modal */}
      <Modal
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        title="Add Hospital Staff Member"
        maxWidth="lg"
      >
        <form onSubmit={handleAddStaff} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              value={staffForm.fullName}
              onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
              placeholder="e.g. Priyantha Jayasuriya"
              required
            />
            <Input
              label="Sri Lankan NIC *"
              value={staffForm.nic}
              onChange={(e) => setStaffForm({ ...staffForm, nic: e.target.value })}
              placeholder="e.g. 198823456789"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Designation / Role *"
              value={staffForm.designation}
              onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
              placeholder="e.g. Senior Nursing Officer, MLT, Ward Clerk"
              required
            />
            <Select
              label="Assigned Department *"
              value={staffForm.departmentId}
              onChange={(e) => setStaffForm({ ...staffForm, departmentId: e.target.value })}
              options={departments.map((d) => ({ label: d.name, value: d.id }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Monthly Salary (LKR)"
              type="number"
              value={staffForm.salaryLkr}
              onChange={(e) => setStaffForm({ ...staffForm, salaryLkr: Number(e.target.value) })}
            />
            <Input
              label="Phone Number"
              value={staffForm.phone}
              onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
              placeholder="0771234567"
            />
            <Select
              label="Employment Type"
              value={staffForm.employmentType}
              onChange={(e) => setStaffForm({ ...staffForm, employmentType: e.target.value })}
              options={[
                { label: 'Permanent', value: 'PERMANENT' },
                { label: 'Contract', value: 'CONTRACT' },
                { label: 'Trainee / Intern', value: 'TRAINEE' },
              ]}
            />
          </div>

          <Input
            label="Email Address (Optional)"
            type="email"
            value={staffForm.email}
            onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
            placeholder="staff@mediplus.lk"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddStaffOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Add Staff Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Member Modal */}
      <Modal
        isOpen={isEditStaffOpen}
        onClose={() => setIsEditStaffOpen(false)}
        title={`Edit Staff Details: ${editingEmployee?.fullName || ''}`}
        maxWidth="lg"
      >
        <form onSubmit={handleEditStaff} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              value={editStaffForm.fullName}
              onChange={(e) => setEditStaffForm({ ...editStaffForm, fullName: e.target.value })}
              required
            />
            <Input
              label="Sri Lankan NIC *"
              value={editStaffForm.nic}
              onChange={(e) => setEditStaffForm({ ...editStaffForm, nic: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Designation / Role *"
              value={editStaffForm.designation}
              onChange={(e) => setEditStaffForm({ ...editStaffForm, designation: e.target.value })}
              required
            />
            <Select
              label="Assigned Department *"
              value={editStaffForm.departmentId}
              onChange={(e) => setEditStaffForm({ ...editStaffForm, departmentId: e.target.value })}
              options={departments.map((d) => ({ label: d.name, value: d.id }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Monthly Salary (LKR)"
              type="number"
              value={editStaffForm.salaryLkr}
              onChange={(e) => setEditStaffForm({ ...editStaffForm, salaryLkr: Number(e.target.value) })}
            />
            <Input
              label="Phone Number"
              value={editStaffForm.phone}
              onChange={(e) => setEditStaffForm({ ...editStaffForm, phone: e.target.value })}
            />
            <Select
              label="Employment Type"
              value={editStaffForm.employmentType}
              onChange={(e) => setEditStaffForm({ ...editStaffForm, employmentType: e.target.value })}
              options={[
                { label: 'Permanent', value: 'PERMANENT' },
                { label: 'Contract', value: 'CONTRACT' },
                { label: 'Trainee / Intern', value: 'TRAINEE' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsEditStaffOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Staff Confirmation Modal */}
      <Modal
        isOpen={isDeleteStaffOpen}
        onClose={() => setIsDeleteStaffOpen(false)}
        title="Confirm Delete Staff Member"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Are you sure you want to remove this staff member?</p>
              <p className="mt-1 text-slate-600">
                This will delete the record for <span className="font-bold text-slate-900">{deletingEmployee?.fullName}</span> ({deletingEmployee?.designation} - {deletingEmployee?.employeeNumber}). This event is recorded in the system audit log.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsDeleteStaffOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={isSubmitting}
              onClick={handleDeleteStaff}
            >
              Delete Staff Member
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Task Modal */}
      <Modal
        isOpen={isAssignTaskOpen}
        onClose={() => setIsAssignTaskOpen(false)}
        title="Assign Healthcare Task / Duty to Staff"
        maxWidth="lg"
      >
        <form onSubmit={handleAssignTask} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Select
            label="Assign to Staff Member *"
            value={taskForm.employeeId}
            onChange={(e) => setTaskForm({ ...taskForm, employeeId: e.target.value })}
            options={employees.map((e) => ({
              label: `${e.fullName} (${e.designation} - ${e.departmentName})`,
              value: e.id,
            }))}
          />

          <Input
            label="Task / Duty Title *"
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            placeholder="e.g. Conduct Ward 2 Medication Round or Calibrate Lab Analyzer"
            required
          />

          <Input
            label="Task Instructions / Notes"
            value={taskForm.description}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            placeholder="Detailed instructions for the staff member"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Priority Level"
              value={taskForm.priority}
              onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
              options={[
                { label: 'Low Priority', value: 'LOW' },
                { label: 'Medium Priority', value: 'MEDIUM' },
                { label: 'High Priority', value: 'HIGH' },
                { label: 'Urgent / Immediate', value: 'URGENT' },
              ]}
            />
            <Select
              label="Assigned Shift"
              value={taskForm.shift}
              onChange={(e) => setTaskForm({ ...taskForm, shift: e.target.value })}
              options={[
                { label: 'Morning Shift (07:00 - 15:00)', value: 'MORNING' },
                { label: 'Evening Shift (15:00 - 23:00)', value: 'EVENING' },
                { label: 'Night Shift (23:00 - 07:00)', value: 'NIGHT' },
                { label: 'All Day Duty', value: 'ALL_DAY' },
              ]}
            />
            <Input
              label="Target Due Date"
              type="date"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAssignTaskOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Assign Duty
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
