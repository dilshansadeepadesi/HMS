import { describe, it, expect, beforeAll } from 'vitest';
import { repository } from '../server/db/repository';

describe('Billing and Payment Accounting in LKR', () => {
  beforeAll(async () => {
    await repository.init();
  });

  it('should calculate line items, discounts, and net total accurately server-side', async () => {
    const invoice = await repository.createInvoice({
      patientId: 'pat-01',
      items: [
        { itemType: 'CONSULTATION', description: 'Consultant Physician', quantity: 1, unitPrice: 2500 },
        { itemType: 'LAB_TEST', description: 'Full Blood Count', quantity: 1, unitPrice: 950 },
        { itemType: 'PHARMACY', description: 'Panadol 500mg', quantity: 20, unitPrice: 5.5 },
      ],
      discountAmount: 160,
    }, 'usr-acc-01');

    // 2500 + 950 + (20 * 5.5 = 110) = 3560. 3560 - 160 = 3400
    expect(invoice.totalAmount).toBe(3560);
    expect(invoice.discountAmount).toBe(160);
    expect(invoice.netAmount).toBe(3400);
    expect(invoice.balanceAmount).toBe(3400);
    expect(invoice.status).toBe('UNPAID');
    expect(invoice.invoiceNumber).toMatch(/^INV-2026-/);
  });

  it('should support partial payment and update balance correctly', async () => {
    const invoice = await repository.createInvoice({
      patientId: 'pat-02',
      items: [
        { itemType: 'CONSULTATION', description: 'OPD Doctor Fee', quantity: 1, unitPrice: 2000 },
      ],
      discountAmount: 0,
    }, 'usr-acc-01');

    // Pay 1200 out of 2000
    const paymentResult = await repository.recordPayment(invoice.id, {
      amount: 1200,
      paymentMethod: 'CASH',
      paymentReference: 'CASH-SLIP-01',
    }, 'usr-acc-01');

    expect(paymentResult.invoice.paidAmount).toBe(1200);
    expect(paymentResult.invoice.balanceAmount).toBe(800);
    expect(paymentResult.invoice.status).toBe('PARTIALLY_PAID');
    expect(paymentResult.payment.receiptNumber).toMatch(/^REC-2026-/);
  });

  it('should mark invoice as PAID when remaining balance is settled', async () => {
    const invoice = await repository.createInvoice({
      patientId: 'pat-03',
      items: [
        { itemType: 'PROCEDURE', description: 'ECG Investigation', quantity: 1, unitPrice: 1500 },
      ],
    }, 'usr-acc-01');

    // Pay full 1500
    const paymentResult = await repository.recordPayment(invoice.id, {
      amount: 1500,
      paymentMethod: 'CARD',
      paymentReference: 'TXN-VISA-991',
    }, 'usr-acc-01');

    expect(paymentResult.invoice.paidAmount).toBe(1500);
    expect(paymentResult.invoice.balanceAmount).toBe(0);
    expect(paymentResult.invoice.status).toBe('PAID');
  });

  it('should reject payment amounts that exceed the outstanding balance', async () => {
    const invoice = await repository.createInvoice({
      patientId: 'pat-01',
      items: [
        { itemType: 'CONSULTATION', description: 'Follow-up Consultation', quantity: 1, unitPrice: 1000 },
      ],
    }, 'usr-acc-01');

    // Attempt to pay 1500 on 1000 balance
    await expect(
      repository.recordPayment(invoice.id, {
        amount: 1500,
        paymentMethod: 'CASH',
      }, 'usr-acc-01')
    ).rejects.toThrow(/cannot exceed/);
  });
});
