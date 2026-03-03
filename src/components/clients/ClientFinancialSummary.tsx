'use client';

import { DollarSign, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientFinancialSummaryProps {
  totalRevenue: number;
  totalPaid: number;
  outstandingBalance: number;
  projectCount: number;
}

export function ClientFinancialSummary({
  totalRevenue,
  totalPaid,
  outstandingBalance,
  projectCount,
}: ClientFinancialSummaryProps) {
  const fmt = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const stats = [
    { label: 'Total Revenue', value: fmt(totalRevenue), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Paid', value: fmt(totalPaid), icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    {
      label: 'Outstanding',
      value: fmt(outstandingBalance),
      icon: outstandingBalance > 0 ? AlertCircle : CheckCircle,
      color: outstandingBalance > 0 ? 'text-red-600' : 'text-green-600',
      bg: outstandingBalance > 0 ? 'bg-red-50' : 'bg-green-50',
      ring: outstandingBalance > 0,
    },
    { label: 'Total Events', value: projectCount.toString(), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5 text-navy" />
        <h3 className="text-base font-semibold text-navy">Financial Summary</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={cn('rounded-xl p-4', s.bg, s.ring && 'ring-2 ring-red-200')}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={cn('h-4 w-4', s.color)} />
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
            </div>
            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
