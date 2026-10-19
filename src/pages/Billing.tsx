import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { formatLKR, formatSriLankanDate, formatSriLankanDateTime } from '../utils/srilankan';
import { CreditCard, Plus, Printer, CheckCircle, AlertCircle, DollarSign, Receipt } from 'lucide-react';

export const Billing: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // New Invoice Form
  const [patientId, setPatientId] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<any[]>([
    { itemType: 'CONSULTATION', description: 'Consultant Doctor Fee', quantity: 1, unitPrice: 2500 },
  ]);
  const [discountAmount, setDiscountAmount] = useState<number | ''>(0);

  // Payment Form
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [invRes, patRes] = await Promise.all([
        apiRequest('/api/billing/invoices'),
        apiRequest('/api/patients'),
      ]);
      if (invRes.success) setInvoices(invRes.invoices);
      if (patRes.success) {
        setPatients(patRes.data);
        if (patRes.data.length > 0 && !patientId) setPatientId(patRes.data[0].id);
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

  const addLineItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      { itemType: 'OTHER', description: 'Hospital Facility Service', quantity: 1, unitPrice: 500 },
    ]);
  };

  const removeLineItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/billing/invoices', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          items: invoiceItems.map((it) => ({
            itemType: it.itemType,
            description: it.description,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
          })),
          discountAmount: discountAmount === '' ? 0 : Number(discountAmount),
        }),
      });

      if (res.success) {
        setIsInvoiceModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice');
    }
  };

  const openPaymentModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPayAmount(invoice.balanceAmount);
    setPayMethod('CASH');
    setPayRef('');
    setPayNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      const res = await apiRequest('/api/billing/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: Number(payAmount),
          paymentMethod: payMethod,
          paymentReference: payRef || null,
          notes: payNotes,
        }),
      });

      if (res.success) {
        setIsPaymentModalOpen(false);
        setSelectedReceipt({
          ...res.payment,
          invoice: res.invoice,
          patientName: selectedInvoice.patientName,
          patientIdNumber: selectedInvoice.patientIdNumber,
        });
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Payment processing failed');
    }
  };

  const viewReceipt = (invoice: any) => {
    if (invoice.payments && invoice.payments.length > 0) {
      const latestPayment = invoice.payments[invoice.payments.length - 1];
      setSelectedReceipt({
        ...latestPayment,
        invoice,
        patientName: invoice.patientName,
        patientIdNumber: invoice.patientIdNumber,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return <Badge variant="success" size="sm">Fully Paid</Badge>;
      case 'PARTIALLY_PAID': return <Badge variant="warning" size="sm">Partially Paid</Badge>;
      case 'UNPAID': return <Badge variant="danger" size="sm">Unpaid</Badge>;
      default: return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const canBill = ['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-teal-600" />
            Hospital Billing & Cashier Desk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sri Lankan Rupee (LKR) invoices, partial settlements, and official payment receipts
          </p>
        </div>

        {canBill && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsInvoiceModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Create New Invoice
          </Button>
        )}
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Net Total (LKR)</th>
                <th className="py-3 px-4">Paid (LKR)</th>
                <th className="py-3 px-4">Balance (LKR)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No hospital invoices generated yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>{inv.patientName}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{inv.patientIdNumber}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatSriLankanDate(inv.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatLKR(inv.netAmount)}
                    </td>
                    <td className="py-3 px-4 text-emerald-700 font-semibold">
                      {formatLKR(inv.paidAmount)}
                    </td>
                    <td className="py-3 px-4 text-rose-700 font-bold">
                      {formatLKR(inv.balanceAmount)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      {inv.balanceAmount > 0 && canBill && (
                        <button
                          onClick={() => openPaymentModal(inv)}
                          className="px-2.5 py-1 bg-teal-600 text-white hover:bg-teal-700 rounded font-semibold text-[11px]"
                        >
                          Receive Payment
                        </button>
                      )}
                      {inv.payments && inv.payments.length > 0 && (
                        <button
                          onClick={() => viewReceipt(inv)}
                          className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-semibold text-[11px] inline-flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Receipt</span>
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

      {/* Create Invoice Modal */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Create Hospital Invoice (LKR)"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <Select
            label="Patient *"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            options={patients.map((p) => ({
              label: `${p.fullName} (${p.patientId})`,
              value: p.id,
            }))}
          />

          <div className="pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-slate-800">Billable Line Items</h4>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem} icon={<Plus className="w-3.5 h-3.5" />}>
                Add Item
              </Button>
            </div>

            {invoiceItems.map((item, idx) => (
              <div key={idx} className="p-3 mb-2 bg-slate-50 border border-slate-200 rounded-lg text-xs grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                <Select
                  label="Type"
                  value={item.itemType}
                  onChange={(e) => {
                    const copy = [...invoiceItems];
                    copy[idx].itemType = e.target.value;
                    setInvoiceItems(copy);
                  }}
                  options={[
                    { label: 'Consultation', value: 'CONSULTATION' },
                    { label: 'Laboratory Investigation', value: 'LAB_TEST' },
                    { label: 'Pharmacy Medicine', value: 'PHARMACY' },
                    { label: 'Ward Bed Charge', value: 'WARD_CHARGE' },
                    { label: 'Procedure / Surgery', value: 'PROCEDURE' },
                    { label: 'Other Service', value: 'OTHER' },
                  ]}
                />
                <Input
                  label="Description"
                  value={item.description}
                  onChange={(e) => {
                    const copy = [...invoiceItems];
                    copy[idx].description = e.target.value;
                    setInvoiceItems(copy);
                  }}
                />
                <Input
                  label="Unit Price (LKR)"
                  type="number"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => {
                    const copy = [...invoiceItems];
                    copy[idx].unitPrice = e.target.value;
                    setInvoiceItems(copy);
                  }}
                />
                <div className="flex items-center gap-2">
                  <Input
                    label="Quantity"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const copy = [...invoiceItems];
                      copy[idx].quantity = e.target.value;
                      setInvoiceItems(copy);
                    }}
                  />
                  {invoiceItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="text-rose-600 hover:text-rose-800 p-1 mt-4"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <Input
              label="Discount Amount (LKR)"
              type="number"
              step="0.01"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value ? Number(e.target.value) : '')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsInvoiceModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Generate Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Receive Payment for Invoice ${selectedInvoice.invoiceNumber}`}
          maxWidth="md"
        >
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Invoice Amount:</span>
                <span className="font-bold text-slate-900">{formatLKR(selectedInvoice.netAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Outstanding Balance:</span>
                <span className="font-bold text-rose-600">{formatLKR(selectedInvoice.balanceAmount)}</span>
              </div>
            </div>

            <Input
              label="Payment Amount (LKR) *"
              type="number"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value ? Number(e.target.value) : '')}
              max={selectedInvoice.balanceAmount}
              required
            />

            <Select
              label="Payment Method *"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              options={[
                { label: 'Cash (Sri Lankan Rupees)', value: 'CASH' },
                { label: 'Credit / Debit Card (VISA / Mastercard / LankaPay)', value: 'CARD' },
                { label: 'Bank Transfer / Slip Deposit', value: 'BANK_TRANSFER' },
                { label: 'Medical Insurance Guarantee (Sri Lanka Insurance, Ceylinco, AIA, Allianz)', value: 'INSURANCE' },
              ]}
            />

            <Input
              label="Payment Reference / Slip / Card Trace Number"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="e.g. Card TXN #984210 or BOC Deposit Slip #45"
            />

            <Input
              label="Cashier Remarks"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="e.g. Paid in full at cashier counter 1"
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Process Payment & Issue Receipt
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Official Printable Receipt Modal */}
      {selectedReceipt && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReceipt(null)}
          title={`Official Payment Receipt — ${selectedReceipt.receiptNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 printable-card">
            <div className="border-b-2 border-teal-600 pb-3 text-center">
              <h2 className="text-lg font-bold text-slate-900">{settings.hospital_name}</h2>
              <p className="text-[11px] text-slate-500">{settings.hospital_address} • {settings.hospital_phone}</p>
              <div className="mt-2 font-mono font-bold text-xs text-teal-800 bg-teal-50 py-1 rounded">
                PAYMENT RECEIPT: #{selectedReceipt.receiptNumber}
              </div>
            </div>

            <div className="text-xs space-y-1.5 p-3 bg-slate-50 rounded-lg">
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="font-semibold">{formatSriLankanDateTime(selectedReceipt.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-semibold text-slate-900">{selectedReceipt.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Ref:</span>
                <span className="font-mono">{selectedReceipt.invoice?.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-semibold">{selectedReceipt.paymentMethod}</span>
              </div>
              {selectedReceipt.paymentReference && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference:</span>
                  <span className="font-mono">{selectedReceipt.paymentReference}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center">
              <span className="font-bold text-xs text-emerald-900">Total Amount Paid:</span>
              <span className="text-lg font-bold text-emerald-900">{formatLKR(selectedReceipt.amount)}</span>
            </div>

            <div className="text-[11px] text-slate-500 text-center italic">
              Thank you for trusting MediPlus Healthcare Sri Lanka.
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 no-print">
              <Button variant="outline" onClick={() => setSelectedReceipt(null)}>
                Close
              </Button>
              <Button variant="primary" onClick={() => window.print()} icon={<Printer className="w-4 h-4" />}>
                Print Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
