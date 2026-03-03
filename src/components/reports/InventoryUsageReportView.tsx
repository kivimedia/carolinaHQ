'use client';

import { useState } from 'react';
import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { useInventoryUsageReport } from '@/hooks/inventory/useReportData';
import { ArrowLeft, Download } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import Link from 'next/link';

function usageLevel(timesBooked: number): { label: string; color: string } {
  if (timesBooked === 0) return { label: 'Unused', color: 'bg-gray-100 text-gray-500' };
  if (timesBooked <= 2) return { label: 'Light', color: 'bg-blue-50 text-blue-600' };
  if (timesBooked <= 5) return { label: 'Moderate', color: 'bg-amber-50 text-amber-600' };
  return { label: 'Heavy', color: 'bg-green-50 text-green-700' };
}

export default function InventoryUsageReportView() {
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const { data: usageData, isLoading } = useInventoryUsageReport(dateRange.from ? dateRange : undefined);

  const exportCSV = () => {
    if (!usageData?.length) return;
    const headers = ['Item', 'SKU', 'Owned', 'Times Booked', 'Total Qty Booked', 'Peak Qty', 'Usage'];
    const rows = usageData.map((item) => [
      item.name, item.sku, item.totalOwned, item.timesBooked, item.totalQtyBooked, item.peakQty, usageLevel(item.timesBooked).label,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-usage-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <InventoryPageLayout title="Inventory Usage">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      </InventoryPageLayout>
    );
  }

  const totalItems = usageData?.length || 0;
  const bookedItems = usageData?.filter(i => i.timesBooked > 0).length || 0;
  const heavyUse = usageData?.filter(i => i.timesBooked > 5).length || 0;

  return (
    <InventoryPageLayout
      title="Inventory Usage"
      description="Item utilization metrics and booking frequency"
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
          <p className="text-sm text-muted-foreground">Total Items Tracked</p>
          <p className="text-2xl font-bold text-navy">{totalItems}</p>
        </div>
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
          <p className="text-sm text-muted-foreground">Items Booked</p>
          <p className="text-2xl font-bold text-blue-600">{bookedItems}</p>
        </div>
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
          <p className="text-sm text-muted-foreground">Heavy Usage</p>
          <p className="text-2xl font-bold text-green-600">{heavyUse}</p>
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
              <th className="text-left px-4 py-3 font-medium text-navy">Item</th>
              <th className="text-left px-4 py-3 font-medium text-navy">SKU</th>
              <th className="text-center px-4 py-3 font-medium text-navy">Owned</th>
              <th className="text-center px-4 py-3 font-medium text-navy">Times Booked</th>
              <th className="text-center px-4 py-3 font-medium text-navy">Total Qty</th>
              <th className="text-center px-4 py-3 font-medium text-navy">Peak Qty</th>
              <th className="text-center px-4 py-3 font-medium text-navy">Usage</th>
            </tr>
          </thead>
          <tbody>
            {(usageData || []).map((item) => {
              const usage = usageLevel(item.timesBooked);
              return (
                <tr key={item.itemId} className="border-t border-cb-pink-50 hover:bg-pink-50/30">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.sku || '-'}</td>
                  <td className="px-4 py-3 text-center">{item.totalOwned}</td>
                  <td className="px-4 py-3 text-center font-medium">{item.timesBooked}</td>
                  <td className="px-4 py-3 text-center">{item.totalQtyBooked}</td>
                  <td className="px-4 py-3 text-center">{item.peakQty}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${usage.color}`}>
                      {usage.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {(!usageData || usageData.length === 0) && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No inventory usage data found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </InventoryPageLayout>
  );
}
