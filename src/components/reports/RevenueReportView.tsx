'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { useRevenueReport, useMonthlyRevenue } from '@/hooks/inventory/useReportData';
import { ArrowLeft, Download } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e',
  confirmed: '#3b82f6',
  in_progress: '#f59e0b',
  draft: '#94a3b8',
  cancelled: '#ef4444',
  lost: '#6b7280',
};

const CHART_PINK = '#ec4899';
const CHART_GOLD = '#d4a853';

export default function RevenueReportView() {
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const { data: projects, isLoading } = useRevenueReport(dateRange.from ? dateRange : undefined);
  const { data: monthlyData } = useMonthlyRevenue(6);

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Calculate summary stats
  const totalRevenue = (projects || []).reduce((s: number, p: any) => s + Number(p.total || 0), 0);
  const totalPaid = (projects || []).reduce((s: number, p: any) => {
    const payments = p.rental_payments || [];
    return s + payments
      .filter((pay: any) => pay.status === 'completed' && pay.type !== 'refund')
      .reduce((sum: number, pay: any) => sum + Number(pay.amount || 0), 0);
  }, 0);
  const totalOutstanding = totalRevenue - totalPaid;

  // Status distribution for pie chart
  const statusCounts: Record<string, number> = {};
  (projects || []).forEach((p: any) => {
    const s = p.status || 'draft';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const exportCSV = () => {
    if (!projects?.length) return;
    const headers = ['Project', 'Status', 'Client', 'Event Date', 'Total', 'Paid', 'Outstanding'];
    const rows = projects.map((p: any) => {
      const paid = (p.rental_payments || [])
        .filter((pay: any) => pay.status === 'completed' && pay.type !== 'refund')
        .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
      return [
        p.name, p.status, p.rental_clients?.name || '', p.start_date || '',
        Number(p.total || 0).toFixed(2), paid.toFixed(2), (Number(p.total || 0) - paid).toFixed(2),
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <InventoryPageLayout title="Revenue Report">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </InventoryPageLayout>
    );
  }

  return (
    <InventoryPageLayout
      title="Revenue Report"
      description="Financial tracking with payment status"
      actions={
        <div className="flex gap-2">
          <Link href="/reports">
            <InventoryButton inventoryVariant="ghost"><ArrowLeft className="h-4 w-4 mr-1" /> Back</InventoryButton>
          </Link>
          <InventoryButton onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export CSV</InventoryButton>
        </div>
      }
    >
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
          <p className="text-sm text-muted-foreground">Total Contract Value</p>
          <p className="text-2xl font-bold text-navy">{fmt(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
          <p className="text-sm text-muted-foreground">Total Collected</p>
          <p className="text-2xl font-bold text-green-600">{fmt(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-bold text-amber-600">{fmt(totalOutstanding)}</p>
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Monthly revenue bar chart */}
        {monthlyData && monthlyData.length > 0 && (
          <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
            <h3 className="text-sm font-semibold text-navy mb-4">Monthly Revenue</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill={CHART_PINK} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Status distribution pie */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
            <h3 className="text-sm font-semibold text-navy mb-4">Project Status Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                    {pieData.map((entry, i) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Projects table */}
      <div className="bg-white rounded-2xl border border-cb-pink-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cb-pink-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-navy">Project</th>
              <th className="text-left px-4 py-3 font-medium text-navy">Status</th>
              <th className="text-left px-4 py-3 font-medium text-navy">Client</th>
              <th className="text-left px-4 py-3 font-medium text-navy">Event Date</th>
              <th className="text-right px-4 py-3 font-medium text-navy">Total</th>
              <th className="text-right px-4 py-3 font-medium text-navy">Paid</th>
              <th className="text-right px-4 py-3 font-medium text-navy">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {(projects || []).map((p: any) => {
              const paid = (p.rental_payments || [])
                .filter((pay: any) => pay.status === 'completed' && pay.type !== 'refund')
                .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
              const outstanding = Number(p.total || 0) - paid;
              return (
                <tr key={p.id} className="border-t border-cb-pink-50 hover:bg-pink-50/30">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                      style={{ backgroundColor: (STATUS_COLORS[p.status] || '#94a3b8') + '20', color: STATUS_COLORS[p.status] || '#94a3b8' }}>
                      {(p.status || 'draft').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.rental_clients?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.start_date ? new Date(p.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(Number(p.total || 0))}</td>
                  <td className="px-4 py-3 text-right text-green-600">{fmt(paid)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${outstanding > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{fmt(outstanding)}</td>
                </tr>
              );
            })}
            {(!projects || projects.length === 0) && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No projects found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </InventoryPageLayout>
  );
}
