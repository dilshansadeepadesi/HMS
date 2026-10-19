import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { formatLKR, formatSriLankanDate } from '../utils/srilankan';
import { Pill, Plus, AlertTriangle, Clock, CheckCircle2, PackageCheck } from 'lucide-react';

export const Pharmacy: React.FC = () => {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'dispense' | 'alerts'>('inventory');

  // New Medicine Modal
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [selectedMedForBatch, setSelectedMedForBatch] = useState<any | null>(null);

  // Dispensing Modal
  const [dispenseTargetRx, setDispenseTargetRx] = useState<any | null>(null);
  const [dispenseItems, setDispenseItems] = useState<any[]>([]);

  // Medicine Form
  const [medForm, setMedForm] = useState({
    code: '',
    brandName: '',
    genericName: '',
    category: 'Antibiotics',
    dosageForm: 'Tablet',
    strength: '500mg',
    unit: 'tablets',
    unitPrice: 10,
    reorderLevel: 100,
    manufacturer: '',
  });

  // Batch Form
  const [batchForm, setBatchForm] = useState({
    medicineId: '',
    batchNumber: '',
    manufacturingDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    purchaseQuantity: 500,
    purchasePrice: 8,
    sellingPrice: 12,
    supplier: 'State Pharmaceuticals Corporation (SPC)',
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [medRes, rxRes] = await Promise.all([
        apiRequest('/api/pharmacy/medicines'),
        apiRequest('/api/emr/prescriptions'),
      ]);
      if (medRes.success) setMedicines(medRes.medicines);
      if (rxRes.success) setPrescriptions(rxRes.prescriptions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/pharmacy/medicines', {
        method: 'POST',
        body: JSON.stringify(medForm),
      });
      setIsAddMedOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add medicine');
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/pharmacy/batches', {
        method: 'POST',
        body: JSON.stringify(batchForm),
      });
      setIsAddBatchOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to receive batch');
    }
  };

  const openDispenseModal = (rx: any) => {
    setDispenseTargetRx(rx);
    // Prepare items with default batch
    const items = rx.items.map((it: any) => {
      const med = medicines.find((m) => m.id === it.medicineId);
      const activeBatch = med?.batches?.find((b: any) => b.currentQuantity >= it.quantityPrescribed);
      return {
        prescriptionItemId: it.id,
        medicineId: it.medicineId,
        brandName: it.brandName,
        quantityPrescribed: it.quantityPrescribed,
        quantityToDispense: it.quantityPrescribed,
        batchId: activeBatch?.id || med?.batches?.[0]?.id || '',
        availableBatches: med?.batches || [],
      };
    });
    setDispenseItems(items);
  };

  const confirmDispense = async () => {
    if (!dispenseTargetRx) return;
    try {
      await apiRequest('/api/emr/prescriptions/dispense', {
        method: 'POST',
        body: JSON.stringify({
          prescriptionId: dispenseTargetRx.id,
          items: dispenseItems.map((i) => ({
            prescriptionItemId: i.prescriptionItemId,
            medicineId: i.medicineId,
            batchId: i.batchId,
            quantityToDispense: Number(i.quantityToDispense),
          })),
        }),
      });
      setDispenseTargetRx(null);
      fetchData();
      alert('Prescription dispensed successfully! Stock levels updated.');
    } catch (err: any) {
      alert(err.message || 'Dispensing failed');
    }
  };

  const canManage = ['ADMIN', 'PHARMACIST'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-600" />
            Hospital Pharmacy & Formulary
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sri Lankan NMRA/SPC drug inventory, batch expiry tracking, and prescription dispensing
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddMedOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Medicine
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold space-x-6">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 ${
            activeTab === 'inventory'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Medicine Formulary & Stock ({medicines.length})
        </button>
        <button
          onClick={() => setActiveTab('dispense')}
          className={`pb-3 ${
            activeTab === 'dispense'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Prescription Dispensing Queue ({prescriptions.filter((p) => p.status === 'PENDING').length} Pending)
        </button>
      </div>

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Brand / Generic Name</th>
                  <th className="py-3 px-4">Category & Strength</th>
                  <th className="py-3 px-4">Unit Price (LKR)</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Batches</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicines.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">
                      {m.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{m.brandName}</div>
                      <div className="text-[11px] text-slate-500">{m.genericName}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>{m.category}</div>
                      <span className="text-[10px] text-slate-400">{m.strength} • {m.dosageForm}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {formatLKR(m.unitPrice)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${m.currentStock <= m.reorderLevel ? 'text-rose-600' : 'text-slate-800'}`}>
                          {m.currentStock} {m.unit}
                        </span>
                        {m.currentStock <= m.reorderLevel && (
                          <Badge variant="warning" size="sm">
                            Low Stock
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-600">
                        {m.batches?.length || 0} batches
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canManage && (
                        <button
                          onClick={() => {
                            setSelectedMedForBatch(m);
                            setBatchForm((prev) => ({ ...prev, medicineId: m.id }));
                            setIsAddBatchOpen(true);
                          }}
                          className="px-2.5 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 font-semibold rounded"
                        >
                          + Receive Batch
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

      {/* Dispensing Tab */}
      {activeTab === 'dispense' && (
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-teal-800">{rx.prescriptionNo}</span>
                    <Badge variant={rx.status === 'DISPENSED' ? 'success' : 'warning'} size="sm">
                      {rx.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-800 font-semibold mt-1">
                    Patient: {rx.patientName} ({rx.patientIdNumber}) • Prescribed by Dr. {rx.doctorName}
                  </div>
                </div>

                {rx.status === 'PENDING' && canManage && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openDispenseModal(rx)}
                    icon={<PackageCheck className="w-4 h-4" />}
                  >
                    Dispense Medicines
                  </Button>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                {rx.items.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between p-2 bg-slate-50 rounded">
                    <div>
                      <span className="font-bold text-slate-800">{it.brandName}</span>
                      <span className="text-slate-500 ml-2">({it.dosage} — {it.frequency} for {it.durationDays} days)</span>
                    </div>
                    <div className="font-semibold text-teal-800">
                      Qty: {it.quantityPrescribed} units
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Medicine Modal */}
      <Modal
        isOpen={isAddMedOpen}
        onClose={() => setIsAddMedOpen(false)}
        title="Add New Medicine to Formulary"
        maxWidth="lg"
      >
        <form onSubmit={handleAddMedicine} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Medicine Code *"
              value={medForm.code}
              onChange={(e) => setMedForm({ ...medForm, code: e.target.value })}
              placeholder="e.g. MED-AZM-250"
              required
            />
            <Input
              label="Brand Name *"
              value={medForm.brandName}
              onChange={(e) => setMedForm({ ...medForm, brandName: e.target.value })}
              placeholder="e.g. Zithromax"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Generic Name (INN) *"
              value={medForm.genericName}
              onChange={(e) => setMedForm({ ...medForm, genericName: e.target.value })}
              placeholder="e.g. Azithromycin"
              required
            />
            <Input
              label="Category *"
              value={medForm.category}
              onChange={(e) => setMedForm({ ...medForm, category: e.target.value })}
              placeholder="e.g. Macrolide Antibiotic"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Strength *"
              value={medForm.strength}
              onChange={(e) => setMedForm({ ...medForm, strength: e.target.value })}
              placeholder="e.g. 500mg"
              required
            />
            <Input
              label="Unit Price (LKR) *"
              type="number"
              step="0.01"
              value={medForm.unitPrice}
              onChange={(e) => setMedForm({ ...medForm, unitPrice: Number(e.target.value) })}
              required
            />
            <Input
              label="Reorder Level *"
              type="number"
              value={medForm.reorderLevel}
              onChange={(e) => setMedForm({ ...medForm, reorderLevel: Number(e.target.value) })}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddMedOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Medicine
            </Button>
          </div>
        </form>
      </Modal>

      {/* Receive Batch Modal */}
      {selectedMedForBatch && (
        <Modal
          isOpen={isAddBatchOpen}
          onClose={() => setIsAddBatchOpen(false)}
          title={`Receive New Stock Batch — ${selectedMedForBatch.brandName}`}
          maxWidth="md"
        >
          <form onSubmit={handleAddBatch} className="space-y-4">
            <Input
              label="Batch Number *"
              value={batchForm.batchNumber}
              onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
              placeholder="e.g. B-AZM-2026-01"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Manufacturing Date *"
                type="date"
                value={batchForm.manufacturingDate}
                onChange={(e) => setBatchForm({ ...batchForm, manufacturingDate: e.target.value })}
                required
              />
              <Input
                label="Expiry Date *"
                type="date"
                value={batchForm.expiryDate}
                onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Purchase Quantity *"
                type="number"
                value={batchForm.purchaseQuantity}
                onChange={(e) => setBatchForm({ ...batchForm, purchaseQuantity: Number(e.target.value) })}
                required
              />
              <Input
                label="Purchase Price per Unit (LKR) *"
                type="number"
                step="0.01"
                value={batchForm.purchasePrice}
                onChange={(e) => setBatchForm({ ...batchForm, purchasePrice: Number(e.target.value) })}
                required
              />
            </div>

            <Input
              label="Supplier / Distributor *"
              value={batchForm.supplier}
              onChange={(e) => setBatchForm({ ...batchForm, supplier: e.target.value })}
              placeholder="e.g. State Pharmaceuticals Corporation (SPC)"
              required
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsAddBatchOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Confirm Stock Intake
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Dispense Confirmation Modal */}
      {dispenseTargetRx && (
        <Modal
          isOpen={true}
          onClose={() => setDispenseTargetRx(null)}
          title={`Dispense Prescription: ${dispenseTargetRx.prescriptionNo}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Select available active batches and verify expiry before dispensing. Expired or depleted batches cannot be selected.
            </p>

            <div className="space-y-3">
              {dispenseItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                  <div className="font-bold text-slate-900">{item.brandName}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      label="Select Batch"
                      value={item.batchId}
                      onChange={(e) => {
                        const copy = [...dispenseItems];
                        copy[idx].batchId = e.target.value;
                        setDispenseItems(copy);
                      }}
                      options={item.availableBatches.map((b: any) => ({
                        label: `${b.batchNumber} (Stock: ${b.currentQuantity} | Exp: ${formatSriLankanDate(b.expiryDate)})`,
                        value: b.id,
                      }))}
                    />
                    <Input
                      label="Quantity to Dispense"
                      type="number"
                      value={item.quantityToDispense}
                      onChange={(e) => {
                        const copy = [...dispenseItems];
                        copy[idx].quantityToDispense = e.target.value;
                        setDispenseItems(copy);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setDispenseTargetRx(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={confirmDispense}>
                Confirm & Deduct Stock
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
