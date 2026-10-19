import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { formatSriLankanDateTime, formatSriLankanDate, formatLKR } from '../utils/srilankan';
import { FlaskConical, Plus, CheckCircle, Printer, AlertCircle } from 'lucide-react';

export const Laboratory: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [requests, setRequests] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPrintRequest, setSelectedPrintRequest] = useState<any | null>(null);

  // Result entry modal
  const [activeResultEntry, setActiveResultEntry] = useState<any | null>(null);
  const [resultValues, setResultValues] = useState<Record<string, string>>({});
  const [resultNotes, setResultNotes] = useState('');

  // Order Test Form State
  const [orderPatientId, setOrderPatientId] = useState('');
  const [orderDoctorId, setOrderDoctorId] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [orderPriority, setOrderPriority] = useState('ROUTINE');
  const [orderHistory, setOrderHistory] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [reqRes, testRes, patRes, docRes] = await Promise.all([
        apiRequest('/api/lab/requests'),
        apiRequest('/api/lab/tests'),
        apiRequest('/api/patients'),
        apiRequest('/api/doctors'),
      ]);

      if (reqRes.success) setRequests(reqRes.requests);
      if (testRes.success) setTests(testRes.tests);
      if (patRes.success) {
        setPatients(patRes.data);
        if (patRes.data.length > 0 && !orderPatientId) setOrderPatientId(patRes.data[0].id);
      }
      if (docRes.success) {
        setDoctors(docRes.doctors);
        if (docRes.doctors.length > 0 && !orderDoctorId) setOrderDoctorId(docRes.doctors[0].id);
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

  const handleOrderTests = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTestIds.length === 0) {
      alert('Please select at least one laboratory test.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiRequest('/api/lab/requests', {
        method: 'POST',
        body: JSON.stringify({
          patientId: orderPatientId,
          doctorId: orderDoctorId,
          testIds: selectedTestIds,
          priority: orderPriority,
          clinicalHistory: orderHistory,
        }),
      });

      if (res.success) {
        setIsOrderOpen(false);
        setSelectedTestIds([]);
        setOrderHistory('');
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to order lab tests');
    } finally {
      setIsSubmitting(false);
    }
  };

  const collectSample = async (requestId: string) => {
    try {
      await apiRequest(`/api/lab/requests/${requestId}/collect-sample`, { method: 'PATCH' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update sample status');
    }
  };

  const openResultEntry = (resObj: any) => {
    setActiveResultEntry(resObj);
    const existing = resObj.resultValuesJson ? JSON.parse(resObj.resultValuesJson) : {};
    setResultValues(existing);
    setResultNotes(resObj.notes || '');
  };

  const saveResults = async () => {
    if (!activeResultEntry) return;
    try {
      await apiRequest('/api/lab/results/enter', {
        method: 'POST',
        body: JSON.stringify({
          resultId: activeResultEntry.id,
          resultValuesJson: JSON.stringify(resultValues),
          notes: resultNotes,
        }),
      });
      setActiveResultEntry(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to enter results');
    }
  };

  const verifyResult = async (resultId: string) => {
    try {
      await apiRequest('/api/lab/results/verify', {
        method: 'POST',
        body: JSON.stringify({ resultId }),
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to verify result');
    }
  };

  const canOrder = ['ADMIN', 'DOCTOR'].includes(user?.role || '');
  const canCollect = ['ADMIN', 'LAB_STAFF', 'NURSE'].includes(user?.role || '');
  const canEnter = ['ADMIN', 'LAB_STAFF'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-600" />
            Medical Laboratory Department
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sample tracking, diagnostic investigations, and verified clinical pathology reports
          </p>
        </div>

        {canOrder && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsOrderOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Order Lab Tests
          </Button>
        )}
      </div>

      {/* Lab Requests List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
            Loading laboratory requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
            No lab requests registered.
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-teal-800">{req.requestNumber}</span>
                    <Badge variant={req.priority === 'URGENT' || req.priority === 'STAT' ? 'danger' : 'neutral'} size="sm">
                      {req.priority}
                    </Badge>
                    <Badge variant={req.status === 'COMPLETED' ? 'success' : 'warning'} size="sm">
                      {req.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-800 font-semibold mt-1">
                    Patient: {req.patientName} ({req.patientIdNumber}) • Dr. {req.doctorName}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {req.status === 'REQUESTED' && canCollect && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => collectSample(req.id)}
                    >
                      Collect Sample
                    </Button>
                  )}
                  {req.status === 'COMPLETED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPrintRequest(req)}
                      icon={<Printer className="w-4 h-4" />}
                    >
                      Print Report
                    </Button>
                  )}
                </div>
              </div>

              {/* Individual Tests Under this Request */}
              <div className="space-y-2">
                {req.results.map((res: any) => {
                  const values = res.resultValuesJson ? JSON.parse(res.resultValuesJson) : null;
                  return (
                    <div key={res.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-900">{res.testName}</span>
                          <span className="text-[11px] text-slate-500 ml-2">Sample: {res.sampleType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={res.status === 'VERIFIED' ? 'success' : res.status === 'COMPLETED' ? 'info' : 'neutral'} size="sm">
                            {res.status}
                          </Badge>
                          {canEnter && res.status !== 'VERIFIED' && (
                            <button
                              onClick={() => openResultEntry(res)}
                              className="px-2 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 font-semibold rounded"
                            >
                              Enter Values
                            </button>
                          )}
                          {canEnter && res.status === 'COMPLETED' && (
                            <button
                              onClick={() => verifyResult(res.id)}
                              className="px-2 py-1 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold rounded"
                            >
                              Verify
                            </button>
                          )}
                        </div>
                      </div>

                      {values && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-white rounded border border-slate-200 font-mono text-[11px]">
                          {Object.entries(values).map(([param, val]) => (
                            <div key={param}>
                              <span className="text-slate-500 block">{param}:</span>
                              <span className="font-bold text-slate-800">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {res.notes && (
                        <div className="text-[11px] text-slate-600 italic">
                          Pathology Notes: {res.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Tests Modal */}
      <Modal
        isOpen={isOrderOpen}
        onClose={() => setIsOrderOpen(false)}
        title="Order Laboratory Investigations"
        maxWidth="xl"
      >
        <form onSubmit={handleOrderTests} className="space-y-4">
          <Select
            label="Patient *"
            value={orderPatientId}
            onChange={(e) => setOrderPatientId(e.target.value)}
            options={patients.map((p) => ({
              label: `${p.fullName} (${p.patientId})`,
              value: p.id,
            }))}
          />

          <Select
            label="Ordering Consultant *"
            value={orderDoctorId}
            onChange={(e) => setOrderDoctorId(e.target.value)}
            options={doctors.map((d) => ({
              label: `${d.fullName} (${d.specialization})`,
              value: d.id,
            }))}
          />

          <Select
            label="Priority"
            value={orderPriority}
            onChange={(e) => setOrderPriority(e.target.value)}
            options={[
              { label: 'Routine (Standard Turnaround)', value: 'ROUTINE' },
              { label: 'Urgent', value: 'URGENT' },
              { label: 'STAT (Immediate Emergency)', value: 'STAT' },
            ]}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Tests to Perform *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
              {tests.map((t) => (
                <label key={t.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={selectedTestIds.includes(t.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTestIds([...selectedTestIds, t.id]);
                      else setSelectedTestIds(selectedTestIds.filter((id) => id !== t.id));
                    }}
                    className="rounded text-teal-600"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">{t.name}</div>
                    <div className="text-[10px] text-slate-500">{formatLKR(t.price)} • {t.sampleType}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Input
            label="Clinical Indication / History"
            value={orderHistory}
            onChange={(e) => setOrderHistory(e.target.value)}
            placeholder="e.g. Rule out Dengue fever / severe dehydration"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsOrderOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Issue Lab Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Result Entry Modal */}
      {activeResultEntry && (
        <Modal
          isOpen={true}
          onClose={() => setActiveResultEntry(null)}
          title={`Enter Test Results: ${activeResultEntry.testName}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-lg text-xs">
              <span className="font-semibold text-teal-900">Reference Ranges:</span>
              <div className="mt-1 font-mono text-[11px] text-slate-600">
                {activeResultEntry.referenceRanges ? (
                  Object.entries(activeResultEntry.referenceRanges).map(([param, range]: any) => (
                    <div key={param}>• {param}: {range}</div>
                  ))
                ) : (
                  <div>Standard clinical parameters apply.</div>
                )}
              </div>
            </div>

            {/* Dynamic Parameter Fields based on Reference Ranges */}
            <div className="space-y-2">
              {activeResultEntry.referenceRanges ? (
                Object.keys(activeResultEntry.referenceRanges).map((param) => (
                  <Input
                    key={param}
                    label={`${param} Tested Value`}
                    value={resultValues[param] || ''}
                    onChange={(e) => setResultValues({ ...resultValues, [param]: e.target.value })}
                    placeholder="Enter tested value"
                  />
                ))
              ) : (
                <Input
                  label="Tested Result Value"
                  value={resultValues['Result'] || ''}
                  onChange={(e) => setResultValues({ ...resultValues, Result: e.target.value })}
                />
              )}
            </div>

            <Input
              label="Technologist Notes / Flagging"
              value={resultNotes}
              onChange={(e) => setResultNotes(e.target.value)}
              placeholder="e.g. Mild thrombocytopenia noted"
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setActiveResultEntry(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={saveResults}>
                Save Test Results
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Printable Report Modal */}
      {selectedPrintRequest && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPrintRequest(null)}
          title={`Printable Laboratory Report — ${selectedPrintRequest.requestNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 printable-card">
            {/* Header */}
            <div className="border-b-2 border-teal-600 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{settings.hospital_name}</h2>
                <p className="text-xs text-slate-500">Clinical Pathology & Diagnostic Laboratory</p>
                <p className="text-[11px] text-slate-400">{settings.hospital_address} • {settings.hospital_phone}</p>
              </div>
              <div className="text-right text-xs">
                <div className="font-mono font-bold text-teal-800">{selectedPrintRequest.requestNumber}</div>
                <div className="text-slate-500">Date: {formatSriLankanDate(selectedPrintRequest.createdAt)}</div>
              </div>
            </div>

            {/* Patient & Doctor Banner */}
            <div className="bg-slate-50 p-3 rounded-lg text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500">Patient Name: </span>
                <span className="font-bold text-slate-900">{selectedPrintRequest.patientName}</span>
              </div>
              <div>
                <span className="text-slate-500">Patient ID: </span>
                <span className="font-mono font-bold text-slate-900">{selectedPrintRequest.patientIdNumber}</span>
              </div>
              <div>
                <span className="text-slate-500">Referring Consultant: </span>
                <span className="font-bold text-slate-900">{selectedPrintRequest.doctorName}</span>
              </div>
              <div>
                <span className="text-slate-500">Report Status: </span>
                <span className="font-bold text-emerald-700">VERIFIED & RELEASED</span>
              </div>
            </div>

            {/* Results Table */}
            <div className="space-y-4">
              {selectedPrintRequest.results.map((res: any) => {
                const values = res.resultValuesJson ? JSON.parse(res.resultValuesJson) : {};
                return (
                  <div key={res.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1.5 font-bold text-xs text-slate-800 flex justify-between">
                      <span>{res.testName}</span>
                      <span className="font-normal text-slate-500">{res.sampleType}</span>
                    </div>
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Investigation</th>
                          <th className="py-2 px-3">Tested Result</th>
                          <th className="py-2 px-3">Biological Reference Range</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(values).map(([param, val]) => (
                          <tr key={param}>
                            <td className="py-2 px-3 font-medium text-slate-800">{param}</td>
                            <td className="py-2 px-3 font-mono font-bold text-teal-900">{String(val)}</td>
                            <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                              {res.referenceRanges?.[param] || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            {/* Sign-off */}
            <div className="pt-8 flex justify-between text-center text-xs text-slate-600">
              <div>
                <div className="w-40 border-b border-slate-400 mb-1"></div>
                <div>Medical Laboratory Technologist</div>
              </div>
              <div>
                <div className="w-40 border-b border-slate-400 mb-1"></div>
                <div>Consultant Clinical Pathologist</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 no-print">
              <Button variant="outline" onClick={() => setSelectedPrintRequest(null)}>
                Close
              </Button>
              <Button variant="primary" onClick={() => window.print()} icon={<Printer className="w-4 h-4" />}>
                Print Laboratory Report
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
