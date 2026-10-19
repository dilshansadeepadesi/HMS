import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { formatLKR, formatSriLankanDate, formatSriLankanDateTime } from '../utils/srilankan';
import {
  Users,
  Calendar,
  CreditCard,
  FlaskConical,
  AlertTriangle,
  Clock,
  Bed,
  Activity,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface DashboardMetrics {
  totalPatients: number;
  todayAppointments: number;
  upcomingAppointments: number;
  totalRevenueLKR: number;
  totalRevenueFormatted: string;
  pendingInvoicesLKR: number;
  pendingInvoicesFormatted: string;
  pendingLabRequests: number;
  lowStockCount: number;
  expiringCount: number;
  activeAdmissions: number;
  lowStockMedicines: { id: string; name: string; generic: string; stock: number; reorder: number }[];
  expiringBatches: { id: string; medicineName: string; batchNumber: string; expiryDate: string; quantity: number }[];
  recentActivities: { id: string; username: string; userRole: string; action: string; entityName: string; timestamp: string }[];
}

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      const data = await apiRequest<{ success: boolean; metrics: DashboardMetrics }>('/api/dashboard/stats');
      if (data.success && data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(false);
    // Real-time activity audit updates every 3 seconds
    const interval = setInterval(() => {
      fetchMetrics(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !metrics) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Loading hospital metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Welcome back, {user?.fullName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            MediPlus Hospital Clinical & Operations Center • Sri Lanka
          </p>
        </div>
        <div className="flex items-center gap-2">
          {['ADMIN', 'RECEPTIONIST'].includes(user?.role || '') && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('patients')}
              icon={<Users className="w-4 h-4" />}
            >
              Register Patient
            </Button>
          )}
          {['ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(user?.role || '') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('appointments')}
              icon={<Calendar className="w-4 h-4" />}
            >
              Book Appointment
            </Button>
          )}
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Patients"
          value={metrics.totalPatients}
          subtitle="All-time active records"
          icon={<Users className="w-6 h-6" />}
          color="teal"
          trend="+5 this week"
        />
        <StatCard
          title="Today's Appointments"
          value={metrics.todayAppointments}
          subtitle={`${metrics.upcomingAppointments} upcoming bookings`}
          icon={<Calendar className="w-6 h-6" />}
          color="sky"
        />
        <StatCard
          title="Revenue (Sri Lankan Rupees)"
          value={metrics.totalRevenueFormatted}
          subtitle={`Pending: ${metrics.pendingInvoicesFormatted}`}
          icon={<CreditCard className="w-6 h-6" />}
          color="emerald"
        />
        <StatCard
          title="Pending Lab Requests"
          value={metrics.pendingLabRequests}
          subtitle="Samples awaiting analysis"
          icon={<FlaskConical className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* Secondary Metrics & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-slate-900">Low Stock Medicines</h3>
            </div>
            <Badge variant={metrics.lowStockCount > 0 ? 'warning' : 'success'} size="sm">
              {metrics.lowStockCount} Items
            </Badge>
          </div>

          {metrics.lowStockMedicines.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Pharmacy stock is optimal.</p>
          ) : (
            <div className="space-y-2.5">
              {metrics.lowStockMedicines.map((m) => (
                <div key={m.id} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">{m.name}</div>
                    <div className="text-[11px] text-slate-500">{m.generic}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-600">{m.stock}</span>
                    <span className="text-slate-400"> / {m.reorder} min</span>
                  </div>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-xs"
                onClick={() => onNavigate('pharmacy')}
              >
                Go to Pharmacy Inventory →
              </Button>
            </div>
          )}
        </div>

        {/* Near Expiry Medicines Alert */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-slate-900">Expiring Medicine Batches</h3>
            </div>
            <Badge variant={metrics.expiringCount > 0 ? 'danger' : 'success'} size="sm">
              {metrics.expiringCount} Batches
            </Badge>
          </div>

          {metrics.expiringBatches.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No batches expiring in the next 60 days.</p>
          ) : (
            <div className="space-y-2.5">
              {metrics.expiringBatches.map((b) => (
                <div key={b.id} className="p-2.5 bg-rose-50/50 border border-rose-100 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">{b.medicineName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">Batch: {b.batchNumber}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-rose-700">{formatSriLankanDate(b.expiryDate)}</div>
                    <div className="text-[10px] text-slate-500">{b.quantity} units left</div>
                  </div>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-xs"
                onClick={() => onNavigate('pharmacy')}
              >
                View Batch Expiry Audit →
              </Button>
            </div>
          )}
        </div>

        {/* Active Admissions & Wards */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                <Bed className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-slate-900">Inpatient Care</h3>
            </div>
            <Badge variant="info" size="sm">
              {metrics.activeAdmissions} Admitted
            </Badge>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Current patient occupancy across Male Medical, Female Surgical, Pediatric, and ICU Wards.
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Active Inpatients:</span>
              <span className="font-bold text-slate-900">{metrics.activeAdmissions}</span>
            </div>
            <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Currency:</span>
              <span className="font-bold text-teal-700">Sri Lankan Rupees (LKR)</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4 text-xs"
            onClick={() => onNavigate('inpatient')}
          >
            Manage Wards & Beds →
          </Button>
        </div>
      </div>

      {/* Recent Activity Audit Trail */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Recent Hospital Activity Audit</h3>
              <p className="text-xs text-slate-500">Real-time system events with actor timestamp</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Real-Time Stream</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {metrics.recentActivities.slice(0, 6).map((log) => (
            <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-800">{log.action.replace(/_/g, ' ')}</span>
                <span className="text-slate-500">• on {log.entityName}</span>
                <Badge variant="neutral" size="sm">
                  {log.userRole}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <span className="font-mono">{log.username}</span>
                <span>{formatSriLankanDateTime(log.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
