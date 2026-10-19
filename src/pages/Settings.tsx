import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { formatSriLankanDateTime } from '../utils/srilankan';
import {
  Settings as SettingsIcon,
  Users,
  Shield,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Plus,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { settings, refreshSettings, updateLogo } = useSettings();
  const [activeTab, setActiveTab] = useState<'branding' | 'users' | 'audit'>('branding');

  // Hospital Info Form
  const [hospitalForm, setHospitalForm] = useState({
    hospital_name: '',
    hospital_reg_no: '',
    hospital_address: '',
    hospital_phone: '',
    hospital_email: '',
  });

  // Logo upload state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // User Management State
  const [users, setUsers] = useState<any[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'NURSE',
    phone: '',
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState('');

  const fetchUsersAndLogs = async () => {
    try {
      const [uRes, logRes] = await Promise.all([
        apiRequest('/api/admin/users'),
        apiRequest('/api/admin/audit-logs'),
      ]);
      if (uRes.success) setUsers(uRes.users);
      if (logRes.success) setAuditLogs(logRes.logs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setHospitalForm({
      hospital_name: settings.hospital_name,
      hospital_reg_no: settings.hospital_reg_no,
      hospital_address: settings.hospital_address,
      hospital_phone: settings.hospital_phone,
      hospital_email: settings.hospital_email,
    });
    fetchUsersAndLogs();
  }, [settings]);

  const handleSaveHospitalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ settings: hospitalForm }),
      });
      refreshSettings();
      alert('Hospital branding settings saved successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    }
  };

  // Logo file selection with validation (PNG, JPEG, WebP, max 2MB)
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoError(null);

    // Validate type
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setLogoError('Invalid image type. Please select a PNG, JPEG, or WebP image.');
      return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Image size exceeds 2MB limit.');
      return;
    }

    // Convert to Base64 data URI for preview & secure upload
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = async () => {
    if (!logoPreview) return;
    try {
      setIsUploadingLogo(true);
      await updateLogo(logoPreview);
      setLogoPreview(null);
      alert('Hospital logo updated across the application and printable documents.');
    } catch (err: any) {
      setLogoError(err.message || 'Failed to upload logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(userForm),
      });
      setIsAddUserOpen(false);
      setUserForm({ username: '', email: '', password: '', fullName: '', role: 'NURSE', phone: '' });
      fetchUsersAndLogs();
      alert('User created successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await apiRequest(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      fetchUsersAndLogs();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-teal-600" />
            System Administration & Hospital Branding
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Branding logo management, role permissions, user access controls, and security audit trail
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold space-x-6">
        <button
          onClick={() => setActiveTab('branding')}
          className={`pb-3 ${
            activeTab === 'branding'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Hospital Branding & Logo
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 ${
            activeTab === 'users'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Staff User Accounts ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 ${
            activeTab === 'audit'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Security & Compliance Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Hospital Branding Tab */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Information Form */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Hospital Institutional Details</h3>
            <form onSubmit={handleSaveHospitalInfo} className="space-y-4">
              <Input
                label="Hospital Brand Name *"
                value={hospitalForm.hospital_name}
                onChange={(e) => setHospitalForm({ ...hospitalForm, hospital_name: e.target.value })}
                required
              />
              <Input
                label="Ministry of Health / SLMC Registration Number *"
                value={hospitalForm.hospital_reg_no}
                onChange={(e) => setHospitalForm({ ...hospitalForm, hospital_reg_no: e.target.value })}
                required
              />
              <Input
                label="Official Hospital Address (Sri Lanka) *"
                value={hospitalForm.hospital_address}
                onChange={(e) => setHospitalForm({ ...hospitalForm, hospital_address: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Contact Phone *"
                  value={hospitalForm.hospital_phone}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, hospital_phone: e.target.value })}
                  required
                />
                <Input
                  label="Inquiries Email *"
                  value={hospitalForm.hospital_email}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, hospital_email: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" variant="primary" size="md">
                Save Hospital Info
              </Button>
            </form>
          </div>

          {/* Logo Upload & Preview Section */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Hospital Logo Customization</h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload a custom hospital emblem or wordmark. It will appear across the header, login page, patient receipts, and laboratory reports.
              </p>
            </div>

            {logoError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{logoError}</span>
              </div>
            )}

            {/* Current Logo or Preview */}
            <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center">
              {logoPreview ? (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-teal-700">Preview Before Saving:</span>
                  <img src={logoPreview} alt="Logo Preview" className="h-20 object-contain mx-auto rounded" />
                </div>
              ) : settings.hospital_logo_url ? (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-600">Current Active Logo:</span>
                  <img src={settings.hospital_logo_url} alt="Current Logo" className="h-20 object-contain mx-auto rounded" />
                </div>
              ) : (
                <div className="space-y-1 text-slate-400 py-4">
                  <ImageIcon className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs">Using default MediPlus healthcare brand mark</p>
                </div>
              )}
            </div>

            {/* Upload controls */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Choose New Image (PNG, JPEG, WebP — Max 2MB)
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoSelect}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
              />

              {logoPreview && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveLogo}
                    isLoading={isUploadingLogo}
                    icon={<Upload className="w-3.5 h-3.5" />}
                  >
                    Confirm & Save Logo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLogoPreview(null)}
                  >
                    Cancel Preview
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Staff Accounts Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddUserOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Staff User Account
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {u.username}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {u.fullName}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="purple" size="sm">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={u.isActive ? 'success' : 'danger'} size="sm">
                        {u.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.username !== 'admin' && (
                        <button
                          onClick={() => toggleUserStatus(u.id, u.isActive)}
                          className={`px-2 py-1 rounded text-[11px] font-semibold ${
                            u.isActive
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security Audit Trail Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <span className="font-bold text-sm text-slate-900">
              Immutable Security & Clinical Audit Events
            </span>
            <span className="text-xs text-slate-400">Total Recorded: {auditLogs.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp (Sri Lanka)</th>
                  <th className="py-3 px-4">Actor / Username</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 text-slate-500">
                      {formatSriLankanDateTime(log.timestamp)}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">
                      {log.username}
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant="neutral" size="sm">
                        {log.userRole}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-teal-800">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      {log.entityName} {log.entityId ? `(#${log.entityId})` : ''}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Create New Staff User Account"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Full Name *"
            value={userForm.fullName}
            onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
            placeholder="e.g. Dr. Kanishka Alwis"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Username *"
              value={userForm.username}
              onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
              placeholder="e.g. dr.alwis"
              required
            />
            <Select
              label="Assigned Role *"
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              options={[
                { label: 'Doctor', value: 'DOCTOR' },
                { label: 'Nurse', value: 'NURSE' },
                { label: 'Receptionist', value: 'RECEPTIONIST' },
                { label: 'Laboratory Staff', value: 'LAB_STAFF' },
                { label: 'Pharmacist', value: 'PHARMACIST' },
                { label: 'Accountant', value: 'ACCOUNTANT' },
                { label: 'Administrator', value: 'ADMIN' },
              ]}
            />
          </div>
          <Input
            label="Email Address *"
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            placeholder="staff@mediplus.lk"
            required
          />
          <Input
            label="Initial Password (Min 8 chars, 1 uppercase, 1 digit, 1 special) *"
            type="password"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            placeholder="••••••••••••"
            required
          />
          <Input
            label="Phone Number"
            value={userForm.phone}
            onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
            placeholder="+94 77 123 4567"
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create User Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
