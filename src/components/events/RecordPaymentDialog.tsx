'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { useCreateRentalPayment } from '@/hooks/inventory/useRentalPayments';

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  outstandingBalance?: number;
}

export function RecordPaymentDialog({ open, onOpenChange, projectId, outstandingBalance }: RecordPaymentDialogProps) {
  const createPayment = useCreateRentalPayment();

  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('deposit');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setAmount(outstandingBalance ? outstandingBalance.toFixed(2) : '');
      setPaymentType('deposit');
      setPaymentMethod('');
      setPaidDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [open, outstandingBalance]);

  if (!open) return null;

  const paymentTypes = ['deposit', 'partial', 'final', 'refund'];
  const paymentMethods = ['Cash', 'Check', 'Credit Card', 'Venmo', 'Zelle', 'PayPal', 'Wire', 'Other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;

    await createPayment.mutateAsync({
      project_id: projectId,
      amount: amt,
      payment_type: paymentType,
      payment_method: paymentMethod || null,
      status: 'completed',
      paid_date: paidDate || null,
      notes: notes || null,
    });
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-navy flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-cb-pink" /> Record Payment
          </h2>
          <button onClick={() => onOpenChange(false)} className="rounded-lg p-1.5 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {outstandingBalance != null && outstandingBalance > 0 && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm">
            Outstanding balance: <span className="font-semibold text-amber-700">${outstandingBalance.toFixed(2)}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-cb-pink-100 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
              >
                {paymentTypes.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
              >
                <option value="">Select...</option>
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Paid</label>
            <input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <InventoryButton inventoryVariant="ghost" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </InventoryButton>
            <InventoryButton type="submit" disabled={!amount || createPayment.isPending}>
              {createPayment.isPending ? 'Recording...' : 'Record Payment'}
            </InventoryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
