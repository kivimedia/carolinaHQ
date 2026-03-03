'use client';

import { useState } from 'react';
import { Plus, DollarSign, CreditCard, Check, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { useEventPayments, useDeleteRentalPayment, useMarkPaymentPaid } from '@/hooks/inventory/useRentalPayments';
import { RecordPaymentDialog } from './RecordPaymentDialog';

interface EventBillingTabProps {
  projectId: string;
  total?: number;
}

export function EventBillingTab({ projectId, total = 0 }: EventBillingTabProps) {
  const { data: payments, isLoading } = useEventPayments(projectId);
  const deletePayment = useDeleteRentalPayment();
  const markPaid = useMarkPaymentPaid();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  const totalPaid = payments?.reduce((sum, p) => p.status === 'completed' ? sum + p.amount : sum, 0) || 0;
  const totalRefunded = payments?.reduce((sum, p) => p.payment_type === 'refund' ? sum + p.amount : sum, 0) || 0;
  const outstanding = total - totalPaid + totalRefunded;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <DollarSign className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 text-green-700';
      case 'pending': return 'bg-yellow-50 text-yellow-700';
      case 'overdue': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <div>
      {/* Financial summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-center">
          <p className="text-xs text-blue-600 mb-1">Total</p>
          <p className="text-xl font-bold text-blue-700">${total.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl bg-green-50 border border-green-100 p-4 text-center">
          <p className="text-xs text-green-600 mb-1">Paid</p>
          <p className="text-xl font-bold text-green-700">${totalPaid.toFixed(2)}</p>
        </div>
        <div className={`rounded-2xl p-4 text-center ${outstanding > 0 ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50 border border-gray-100'}`}>
          <p className={`text-xs mb-1 ${outstanding > 0 ? 'text-amber-600' : 'text-gray-600'}`}>Outstanding</p>
          <p className={`text-xl font-bold ${outstanding > 0 ? 'text-amber-700' : 'text-gray-700'}`}>
            ${outstanding.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Payments list */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-navy">
          Payments {payments && payments.length > 0 && `(${payments.length})`}
        </h3>
        <InventoryButton onClick={() => setPaymentDialogOpen(true)} className="text-sm">
          <Plus className="h-4 w-4 mr-1" /> Record Payment
        </InventoryButton>
      </div>

      {!payments || payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cb-pink-100 p-8 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-cb-pink/40" />
          <p className="mt-2 text-sm text-muted-foreground">No payments recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-cb-pink-100 hover:bg-cb-pink-50/20 transition-colors">
              {getStatusIcon(payment.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">${payment.amount.toFixed(2)}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(payment.status)}`}>
                    {payment.status}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">{payment.payment_type}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {payment.payment_method && `${payment.payment_method} - `}
                  {payment.paid_date
                    ? new Date(payment.paid_date).toLocaleDateString()
                    : payment.due_date
                      ? `Due: ${new Date(payment.due_date).toLocaleDateString()}`
                      : new Date(payment.created_at).toLocaleDateString()
                  }
                  {payment.notes && ` - ${payment.notes}`}
                </p>
              </div>
              <div className="flex gap-1">
                {payment.status !== 'completed' && (
                  <InventoryButton
                    inventoryVariant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => markPaid.mutate({ id: payment.id, project_id: projectId })}
                  >
                    Mark Paid
                  </InventoryButton>
                )}
                <button
                  onClick={() => deletePayment.mutate({ id: payment.id, project_id: projectId })}
                  className="rounded-lg p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        projectId={projectId}
        outstandingBalance={outstanding > 0 ? outstanding : undefined}
      />
    </div>
  );
}
