'use client';

import { useRouter } from 'next/navigation';
import {
  DollarSign, TrendingUp, AlertCircle, CreditCard, Calendar,
  ArrowRight, CheckCircle, Clock, RefreshCw,
} from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { useFinancialOverview, useRecentPayments, useDueBalances } from '@/hooks/inventory/useFinancialOverview';

export default function FinancesOverview() {
  const router = useRouter();
  const { data: stats, isLoading: statsLoading } = useFinancialOverview();
  const { data: recentPayments, isLoading: paymentsLoading } = useRecentPayments(8);
  const { data: dueBalances, isLoading: dueLoading } = useDueBalances();

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (statsLoading) {
    return (
      <InventoryPageLayout title="Finances">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </InventoryPageLayout>
    );
  }

  return (
    <InventoryPageLayout title="Finances" description="Financial overview and payment tracking">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-xl bg-blue-50 p-2"><DollarSign className="h-5 w-5 text-blue-500" /></div>
            <span className="text-xs font-medium text-muted-foreground">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-navy">{fmt(stats?.totalRevenue || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.completedEvents || 0} completed events
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-xl bg-green-50 p-2"><CheckCircle className="h-5 w-5 text-green-500" /></div>
            <span className="text-xs font-medium text-muted-foreground">Total Paid</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{fmt(stats?.totalPaid || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.paymentsThisMonth || 0} payments this month
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-xl bg-amber-50 p-2"><Clock className="h-5 w-5 text-amber-500" /></div>
            <span className="text-xs font-medium text-muted-foreground">Outstanding</span>
          </div>
          <p className={`text-2xl font-bold ${(stats?.totalOutstanding || 0) > 0 ? 'text-amber-600' : 'text-gray-600'}`}>
            {fmt(stats?.totalOutstanding || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {dueBalances?.length || 0} events with balance
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-xl bg-cb-pink/10 p-2"><TrendingUp className="h-5 w-5 text-cb-pink" /></div>
            <span className="text-xs font-medium text-muted-foreground">This Month</span>
          </div>
          <p className="text-2xl font-bold text-cb-pink">{fmt(stats?.revenueThisMonth || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.activeEvents || 0} active events
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent payments */}
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-navy">Recent Payments</h3>
            <InventoryButton
              inventoryVariant="ghost"
              className="text-xs"
              onClick={() => router.push('/finances/client-activity')}
            >
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </InventoryButton>
          </div>

          {paymentsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : !recentPayments || recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No payments yet</p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((payment: any) => (
                <div
                  key={payment.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-cb-pink-50/30 transition-colors cursor-pointer"
                  onClick={() => payment.rental_projects?.id && router.push(`/events/${payment.rental_projects.id}`)}
                >
                  <div className={`rounded-full p-1.5 ${
                    payment.status === 'completed' ? 'bg-green-50' : 'bg-yellow-50'
                  }`}>
                    {payment.status === 'completed'
                      ? <CheckCircle className="h-4 w-4 text-green-500" />
                      : <Clock className="h-4 w-4 text-yellow-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {payment.rental_projects?.rental_clients?.name || payment.rental_projects?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.payment_method || payment.payment_type} - {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-semibold text-sm">{fmt(payment.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Due balances */}
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-navy">Due Balances</h3>
          </div>

          {dueLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : !dueBalances || dueBalances.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="mx-auto h-8 w-8 text-green-400" />
              <p className="text-sm text-muted-foreground mt-2">All balances paid!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dueBalances.slice(0, 8).map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-cb-pink-50/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/events/${item.id}`)}
                >
                  <div className="rounded-full p-1.5 bg-amber-50">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(item.rental_clients as any)?.name || 'No client'} -
                      Total: {fmt(item.total || 0)}, Paid: {fmt(item.paid)}
                    </p>
                  </div>
                  <span className="font-semibold text-sm text-amber-600">{fmt(item.outstanding)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </InventoryPageLayout>
  );
}
