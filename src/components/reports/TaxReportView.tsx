'use client';

import { useState } from 'react';
import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { useTaxReport } from '@/hooks/inventory/useReportData';
import { ArrowLeft, Download } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import Link from 'next/link';

export default function TaxReportView() {
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const { data: taxData, isLoading } = useTaxReport(dateRange.from ? dateRange : undefined);

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalSubtotal = (taxData || []).reduce((s: number, p: any) => s + Number(p.subtotal || 0), 0);
  const totalTax = (taxData || []).reduce((s: number, p: any) => s + Number(p.tax_amount || 0), 0);
  const totalRevenue = (taxData || []).reduce((s: number, p: any) => s + Number(p.total || 0), 0);

  const exportCSV = () => {
    if (!taxData?.length) return;
    const headers = ['Project', 'Client', 'Event Date', 'Subtotal', 'Tax Rate', 'Tax Amount', 'Total'];
    const rows = taxData.map((p: any) => {
      const taxRate = Number(p.subtotal) > 0 ? ((Number(p.tax_amount) / Number(p.subtotal)) * 100).toFixed(2) + '%' : '-';
      return [
        p.name, p.rental_clients?.name || '', p.start_date || '',
        Number(p.subtotal || 0).toFixed(2), taxRate, Number(p.tax_amount || 0).toFixed(2), Number(p.total || 0).toFixed(2),
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <InventoryPageLayout title="Tax Report">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      </InventoryPageLayout>
    );
  }

  return (
    <InventoryPageLayout
      title="Tax Report"
      description="Tax accrual and breakdown by period"
      actions={
        <div className="flex gap-2">
          <Link href="/reports">
            <InventoryButton inventoryVariant="ghost"><ArrowLeft className="h-4 w-4 mr-1" /> Back</InventoryButton>
          </Link>
          <InventoryButton onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export CSV</InventoryButton>
        </div>
      }
    >
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
          <p className="text-sm text-muted-foreground">Subtotal (Pre-Tax)</p>
          <p className="text-2xl font-bold text-navy">{fmt(totalSubtotal)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
          <p className="text-sm text-muted-foreground">Total Tax Collected</p>
          <p className="text-2xl font-bold text-purple-600">{fmt(totalTax)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">{fmt(totalRevenue)}</p>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex gap-3 mb-6 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" value={dateRange.from} onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="rounded-xl border border-cb-pink-100 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" value={dateRange.to} onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="rounded-xl border border-cb-pink-100 px-3 py-2 text-sm" />
        </div>
        {(dateRange.from || dateRange.to) && (
          <button onClick={() => setDateRange({ from: '', to: '' })} className="text-xs text-cb-pink hover:underline pb-2">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-cb-pink-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cb-pink-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-navy">Project</th>
              <th className="text-left px-4 py-3 font-medium text-navy">Client</th>
              <th className="text-left px-4 py-3 font-medium text-navy">Event Date</th>
              <th className="text-right px-4 py-3 font-medium text-navy">Subtotal</th>
              <th className="text-right px-4 py-3 font-medium text-navy">Tax Rate</th>
              <th className="text-right px-4 py-3 font-medium text-navy">Tax Amount</th>
            </tr>
          </thead>
          <tbody>
            {(taxData || []).map((p: any) => {
              const taxRate = Number(p.subtotal) > 0 ? ((Number(p.tax_amount) / Number(p.subtotal)) * 100).toFixed(2) : '0.00';
              return (
                <tr key={p.id} className="border-t border-cb-pink-50 hover:bg-pink-50/30">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.rental_clients?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.start_date ? new Date(p.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">{fmt(Number(p.subtotal || 0))}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{taxRate}%</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(Number(p.tax_amount || 0))}</td>
                </tr>
              );
            })}
            {(!taxData || taxData.length === 0) && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No tax data found</td></tr>
            )}
          </tbody>
          {(taxData || []).length > 0 && (
            <tfoot className="bg-cb-pink-50 font-medium">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right">Totals:</td>
                <td className="px-4 py-3 text-right">{fmt(totalSubtotal)}</td>
                <td className="px-4 py-3 text-right"></td>
                <td className="px-4 py-3 text-right text-purple-700">{fmt(totalTax)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </InventoryPageLayout>
  );
}
