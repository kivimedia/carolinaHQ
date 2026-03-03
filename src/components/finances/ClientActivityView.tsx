'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowLeft, DollarSign, ArrowUpDown, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { useRentalPayments } from '@/hooks/inventory/useRentalPayments';

type SortField = 'created_at' | 'amount' | 'client' | 'status';
type SortDir = 'asc' | 'desc';

export default function ClientActivityView() {
  const router = useRouter();
  const { data: payments, isLoading, error, refetch } = useRentalPayments();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'amount' ? 'desc' : 'asc');
    }
  };

  const filtered = useMemo(() => {
    if (!payments) return [];
    let result = [...payments] as any[];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p: any) =>
          p.rental_projects?.name?.toLowerCase().includes(q) ||
          p.rental_projects?.rental_clients?.name?.toLowerCase().includes(q) ||
          p.payment_method?.toLowerCase().includes(q) ||
          p.notes?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((p: any) => p.status === statusFilter);
    }

    result.sort((a: any, b: any) => {
      let cmp = 0;
      switch (sortField) {
        case 'created_at': cmp = a.created_at.localeCompare(b.created_at); break;
        case 'amount': cmp = a.amount - b.amount; break;
        case 'client': cmp = (a.rental_projects?.rental_clients?.name || '').localeCompare(b.rental_projects?.rental_clients?.name || ''); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [payments, search, statusFilter, sortField, sortDir]);

  const totals = useMemo(() => {
    const all = payments || [];
    return {
      total: (all as any[]).reduce((s, p: any) => s + p.amount, 0),
      completed: (all as any[]).filter((p: any) => p.status === 'completed').reduce((s: number, p: any) => s + p.amount, 0),
      pending: (all as any[]).filter((p: any) => p.status === 'pending').reduce((s: number, p: any) => s + p.amount, 0),
    };
  }, [payments]);

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <DollarSign className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-50 text-green-700',
      pending: 'bg-yellow-50 text-yellow-700',
      overdue: 'bg-red-50 text-red-700',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || 'bg-gray-50 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 font-medium text-gray-600 hover:text-navy transition-colors"
    >
      {children}
      <ArrowUpDown className={`h-3 w-3 ${sortField === field ? 'text-cb-pink' : 'text-gray-300'}`} />
    </button>
  );

  if (isLoading) {
    return (
      <InventoryPageLayout title="Client Activity">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </InventoryPageLayout>
    );
  }

  return (
    <InventoryPageLayout
      title="Client Activity"
      description={`${payments?.length || 0} total transactions`}
      actions={
        <InventoryButton inventoryVariant="ghost" onClick={() => router.push('/finances')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Finances
        </InventoryButton>
      }
    >
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total</p>
          <p className="text-xl font-bold text-navy">{fmt(totals.total)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-green-100 p-4 text-center">
          <p className="text-xs text-green-600 mb-1">Completed</p>
          <p className="text-xl font-bold text-green-600">{fmt(totals.completed)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-yellow-100 p-4 text-center">
          <p className="text-xs text-yellow-600 mb-1">Pending</p>
          <p className="text-xl font-bold text-yellow-600">{fmt(totals.pending)}</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, event, method..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cb-pink-100 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30 bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cb-pink-100 p-12 text-center">
          <DollarSign className="mx-auto h-10 w-10 text-cb-pink/40" />
          <p className="mt-2 text-sm text-muted-foreground">No transactions found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-cb-pink-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cb-pink-100 bg-cb-pink-50/30">
                <th className="text-left px-4 py-3"><SortHeader field="created_at">Date</SortHeader></th>
                <th className="text-left px-4 py-3"><SortHeader field="client">Client / Event</SortHeader></th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                <th className="text-left px-4 py-3"><SortHeader field="status">Status</SortHeader></th>
                <th className="text-right px-4 py-3"><SortHeader field="amount">Amount</SortHeader></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment: any) => (
                <tr
                  key={payment.id}
                  className="border-b last:border-b-0 border-cb-pink-50 hover:bg-cb-pink-50/20 transition-colors cursor-pointer"
                  onClick={() => payment.rental_projects?.id && router.push(`/events/${payment.rental_projects.id}`)}
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{payment.rental_projects?.rental_clients?.name || '-'}</p>
                    <p className="text-xs text-muted-foreground">{payment.rental_projects?.name || '-'}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{payment.payment_type}</td>
                  <td className="px-4 py-3">{payment.payment_method || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(payment.status)}
                      {getStatusBadge(payment.status)}
                    </div>
                  </td>
                  <td className="text-right px-4 py-3 font-semibold">
                    {payment.payment_type === 'refund' ? (
                      <span className="text-red-500">-{fmt(payment.amount)}</span>
                    ) : (
                      fmt(payment.amount)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </InventoryPageLayout>
  );
}
