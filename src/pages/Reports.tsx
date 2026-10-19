import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { StatCard } from '../components/common/StatCard';
import { formatLKR } from '../utils/srilankan';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  Printer,
  Users,
  DollarSign,
  Pill,
  Sparkles,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest('/api/reports/summary');
      if (res.success) setSummary(res.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const downloadCsv = (type: string) => {
    window.open(`/api/reports/export-csv?type=${type}`, '_blank');
  };

  const downloadExcel = (type: string) => {
    window.open(`/api/reports/export-excel?type=${type}`, '_blank');
  };

  const downloadPdf = (type: string) => {
    window.open(`/api/reports/export-pdf?type=${type}&auto=true`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            Hospital Analytics & Executive Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational summaries, Sri Lankan Rupee financial analytics, and multi-format reporting exports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadPdf('revenue')}
            icon={<FileDown className="w-4 h-4 text-rose-600" />}
          >
            Export PDF Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadExcel('revenue')}
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Export Excel (.xls)
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.print()}
            icon={<Printer className="w-4 h-4" />}
          >
            Print Overview
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Collected Revenue"
            value={formatLKR(summary.metrics.totalRevenueLKR)}
            subtitle="Processed patient invoices in LKR"
            icon={<DollarSign className="w-6 h-6" />}
            color="emerald"
          />
          <StatCard
            title="Registered Patients"
            value={summary.totalPatientsCount}
            subtitle="Sri Lankan national registry"
            icon={<Users className="w-6 h-6" />}
            color="teal"
          />
          <StatCard
            title="Appointments Processed"
            value={summary.totalAppointmentsCount}
            subtitle="Scheduled outpatient clinics"
            icon={<BarChart3 className="w-6 h-6" />}
            color="sky"
          />
          <StatCard
            title="Active Formulary Items"
            value={summary.totalMedicinesCount}
            subtitle="In-stock pharmacy items"
            icon={<Pill className="w-6 h-6" />}
            color="purple"
          />
        </div>
      )}

      {/* Export Centers with 3 Formats: Excel, CSV, PDF */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            Hospital Report Export Center — Excel, CSV & PDF Formats
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed mt-1">
            Download certified hospital operational datasets in Microsoft Excel (.xls), Comma-Separated Values (.csv), or print-ready PDF formats for audit compliance and Ministry of Health reviews.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
          {/* 1. Revenue Ledger */}
          <div className="p-5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4 hover:border-teal-300 transition-colors">
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <DollarSign className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Financial Revenue Ledger</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Itemized invoices, patient discounts, payments received, and outstanding balances in Sri Lankan Rupees (LKR).
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => downloadExcel('revenue')}
                className="w-full px-3 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export as Excel (.xls)</span>
              </button>

              <button
                onClick={() => downloadCsv('revenue')}
                className="w-full px-3 py-2 text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-sky-600" />
                <span>Export as CSV (.csv)</span>
              </button>

              <button
                onClick={() => downloadPdf('revenue')}
                className="w-full px-3 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileDown className="w-3.5 h-3.5 text-rose-600" />
                <span>Export as PDF (.pdf)</span>
              </button>
            </div>
          </div>

          {/* 2. Patient Demographics */}
          <div className="p-5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4 hover:border-teal-300 transition-colors">
            <div>
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Patient Registry Demographics</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Sri Lankan patient records, verified NIC numbers, blood groups, telephone, provinces, and districts.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => downloadExcel('patients')}
                className="w-full px-3 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export as Excel (.xls)</span>
              </button>

              <button
                onClick={() => downloadCsv('patients')}
                className="w-full px-3 py-2 text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-sky-600" />
                <span>Export as CSV (.csv)</span>
              </button>

              <button
                onClick={() => downloadPdf('patients')}
                className="w-full px-3 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileDown className="w-3.5 h-3.5 text-rose-600" />
                <span>Export as PDF (.pdf)</span>
              </button>
            </div>
          </div>

          {/* 3. Pharmacy Inventory */}
          <div className="p-5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4 hover:border-teal-300 transition-colors">
            <div>
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
                <Pill className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Pharmacy & Stock Formulary</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Medicines list, active stock counts, unit prices in LKR, reorder thresholds, and NMRA registration data.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => downloadExcel('pharmacy')}
                className="w-full px-3 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export as Excel (.xls)</span>
              </button>

              <button
                onClick={() => downloadCsv('pharmacy')}
                className="w-full px-3 py-2 text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-sky-600" />
                <span>Export as CSV (.csv)</span>
              </button>

              <button
                onClick={() => downloadPdf('pharmacy')}
                className="w-full px-3 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileDown className="w-3.5 h-3.5 text-rose-600" />
                <span>Export as PDF (.pdf)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
