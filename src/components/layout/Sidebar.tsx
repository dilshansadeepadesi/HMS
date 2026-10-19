import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Calendar,
  FileText,
  FlaskConical,
  Pill,
  CreditCard,
  Bed,
  UserCheck,
  BarChart3,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      allowedRoles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_STAFF', 'PHARMACIST', 'ACCOUNTANT'],
    },
    {
      id: 'patients',
      label: 'Patients',
      icon: <Users className="w-5 h-5" />,
      allowedRoles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'ACCOUNTANT'],
    },
    {
      id: 'appointments',
      label: 'Appointments',
      icon: <Calendar className="w-5 h-5" />,
      allowedRoles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'],
    },
    {
      id: 'doctors',
      label: 'Doctors & Clinics',
      icon: <Stethoscope className="w-5 h-5" />,
      allowedRoles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR'],
    },
    {
      id: 'emr',
      label: 'Clinical Records (EMR)',
      icon: <FileText className="w-5 h-5" />,
      allowedRoles: ['ADMIN', 'DOCTOR', 'NURSE'],
    },
    {
      id: 'laboratory',
      label: 'Laboratory',
      icon: <FlaskConical className="w-5 h-5" />,
      allowedRoles: ['ADMIN', 'DOCTOR', 'NURSE', 'LAB_STAFF'],
    },
    {
      id: 'pharmacy',
      label: 'Pharmacy & Stock',
      icon: <Pill className="w-5 h-5" />,
      allowedRoles: ['ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'],
    },
    {
      id: 'billing',
      label: 'Billing & Cashier',
      icon: <CreditCard className="w-5 h-5" />,
      allowedRoles: ['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'],
    },
    {
      id: 'inpatient',
      label: 'Wards & Admissions',
      icon: <Bed className="w-5 h-5" />,
      allowedRoles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'],
    },
    {
      id: 'staff',
      label: 'Staff & Attendance',
      icon: <UserCheck className="w-5 h-5" />,
      allowedRoles: ['ADMIN', 'ACCOUNTANT'],
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      allowedRoles: ['ADMIN', 'ACCOUNTANT', 'DOCTOR'],
    },
  ];

  const filteredItems = navItems.filter((item) =>
    user ? item.allowedRoles.includes(user.role) : false
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 left-0 z-40 h-full lg:h-[calc(100vh-4rem)] w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800">
          <span className="font-bold text-white text-sm">MediPlus Navigation</span>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          <div>MediPlus HMS v1.0.0</div>
          <div>Configured for Sri Lanka (LKR)</div>
        </div>
      </aside>
    </>
  );
};
