'use client';

import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { useDueBalancesReport } from '@/hooks/inventory/useReportData';
import { ArrowLeft, Download } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import Link from 'next/link';

const AGING_COLORS: Record<string, string> = {
  '0-30': 'bg-green-50 text-green-700',
  '31-60': 'bg-amber-50 text-amber-700',
  '60+': 'bg-red-50 text-red-700',
};

export default function DueBalancesReportView() {
  const { data: balances, isLoading } = useDueBalancesReport();

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const exportCSV = () => {
    if (!balances?.length) return;
    const headers = ['Project', 'Client', 'Event Date', 'Total', 'Paid', 'Balance', 'Days Overdue', 'Aging'];
    const rows = balances.map((b: any) => [
      b.name, b.clientName, b.start_date || '', Number(b.total || 0).toFixed(2),
      b.paid.toFixed(2), b.balance.toFixed(2), b.daysOverdue, b.agingBucket,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `due-balances-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <InventoryPageLayout title="Due Balances">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      </InventoryPageLayout>
    );
  }

  const totalBalance = (balances || []).reduce((s: number, b: any) => s + b.balance, 0);
  const bucket030 = (balances || []).filter((b: any) => b.agingBucket === '0-30').reduce((s: number, b: any) => s + b.balance, 0);
  const bucket3160 = (balances || []).filter((b: any) => b.agingBucket === '31-60').reduce((s: number, b: any) => s + b.balance, 0);
  const bucket60plus = (balances || []).filter((b: any) => b.agingBucket === '60+').reduce((s: number, b: any) => s + b.balance, 0);

  return (
    <InventoryPageLayout
      title="Due Balances"
      description="Outstanding payment aging analysis"
      actions={
        <div className="flex gap-2">
          <Link href="/reports">
            <InventoryButton inventoryVariant="ghost"><ArrowLeft className="h-4 w-4 mr-1" /> Back</InventoryButton>
          </Link>
          <InventoryButton onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export CSV</InventoryButton>
        </div>
      }
    >
      {/* Aging buckets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
          <p className="text-sm text-muted-foreground">Total Outstanding</p>
          <p className="text-2xl font-bold text-navy">{fmt(totalBalance)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-green-200 p-5">
          <p className="text-sm text-green-600">0 - 30 days</p>
          <p className="text-2xl font-bold text-green-700">{fmt(bucket030)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 p-5">
          <p className="text-sm text-amber-600">31 - 60 days</p>
          <p className="text-2xl font-bold text-amber-700">{fmt(bucket3160)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-red-200 p-5">
          <p className="text-sm text-red-600">60+ days</p>
          <p className="text-2xl font-bold text-red-700">{fmt(bucket60plus)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-cb-pink-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cb-pink-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-navy">Project</th>
              <th className="text-left px-4 py-3 font-medium text-navy">Client</th>
              <th className="text-left px-4 py-3 font-medium text-navy">Event Date</th>
              <th className="text-right px-4 py-3 font-medium text-navy">Total</th>
              <th className="text-right px-4 py-3 font-medium text-navy">Paid</th>
              <th className="text-right px-4 py-3 font-medium text-navy">Balance</th>
              <th className="text-center px-4 py-3 font-medium text-navy">Aging</th>
            </tr>
          </thead>
          <tbody>
            {(balances || []).map((b: any) => (
              <tr key={b.id} className="border-t border-cb-pink-50 hover:bg-pink-50/30">
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3 text-gray-600">{b.clientName}</td>
                <td className="px-4 py-3 text-gray-600">
                  {b.start_date ? new Date(b.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                </td>
                <td className="px-4 py-3 text-right">{fmt(Number(b.total || 0))}</td>
                <td className="px-4 py-3 text-right text-green-600">{fmt(b.paid)}</td>
                <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(b.balance)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${AGING_COLORS[b.agingBucket] || ''}`}>
                    {b.agingBucket} days
                  </span>
                </td>
              </tr>
            ))}
            {(!balances || balances.length === 0) && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No outstanding balances</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </InventoryPageLayout>
  );
}
