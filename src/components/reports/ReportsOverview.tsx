'use client';

import { DollarSign, Package, Clock, Receipt } from 'lucide-react';
import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import Link from 'next/link';

const reports = [
  {
    title: 'Revenue Report',
    description: 'Financial tracking with payment status by project',
    icon: DollarSign,
    href: '/reports/revenue',
    color: 'text-green-600 bg-green-50',
  },
  {
    title: 'Inventory Usage',
    description: 'Item utilization metrics and booking frequency',
    icon: Package,
    href: '/reports/inventory-usage',
    color: 'text-blue-600 bg-blue-50',
  },
  {
    title: 'Due Balances',
    description: 'Outstanding payment aging analysis by client',
    icon: Clock,
    href: '/reports/due-balances',
    color: 'text-amber-600 bg-amber-50',
  },
  {
    title: 'Tax Report',
    description: 'Tax accrual and breakdown by period',
    icon: Receipt,
    href: '/reports/tax',
    color: 'text-purple-600 bg-purple-50',
  },
];

export default function ReportsOverview() {
  return (
    <InventoryPageLayout title="Reports" description="Analytics and business intelligence">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="bg-white rounded-2xl border border-cb-pink-100 p-6 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className={`rounded-xl p-3 ${report.color}`}>
                <report.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-navy group-hover:text-cb-pink transition-colors">
                  {report.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </InventoryPageLayout>
  );
}
