import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { Logo } from '../common/Logo';
import { Badge } from '../common/Badge';
import { Clock, LogOut, Menu, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { currentTime } = useSettings();

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'danger';
      case 'DOCTOR': return 'purple';
      case 'NURSE': return 'info';
      case 'RECEPTIONIST': return 'neutral';
      case 'LAB_STAFF': return 'warning';
      case 'PHARMACIST': return 'teal' as any;
      case 'ACCOUNTANT': return 'success';
      default: return 'neutral';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Logo size="sm" showSubtitle={false} />
      </div>

      <div className="flex items-center gap-4">
        {/* Sri Lankan Live Time & Timezone Indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-teal-600" />
          <span className="font-medium">{currentTime || 'Asia/Colombo'}</span>
          <span className="text-[10px] bg-teal-100 text-teal-800 font-semibold px-1 rounded">LK</span>
        </div>

        {/* User Profile & Role */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-semibold text-xs">
              <UserIcon className="w-4 h-4 text-slate-600" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {user.fullName}
              </div>
              <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                {user.role}
              </Badge>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
