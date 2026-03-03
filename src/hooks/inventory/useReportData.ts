'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

// Revenue report - projects with financial data
export function useRevenueReport(dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: ['revenue-report', dateRange],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('rental_projects')
        .select('*, rental_clients(name), rental_payments(amount, status, payment_date, type)')
        .order('start_date', { ascending: false });

      if (dateRange?.from) query = query.gte('start_date', dateRange.from);
      if (dateRange?.to) query = query.lte('start_date', dateRange.to);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

// Monthly revenue for charts
export function useMonthlyRevenue(months = 6) {
  return useQuery({
    queryKey: ['monthly-revenue', months],
    queryFn: async () => {
      const supabase = createClient();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data, error } = await supabase
        .from('rental_payments')
        .select('amount, payment_date, status')
        .gte('payment_date', startDate.toISOString().split('T')[0])
        .eq('status', 'completed');

      if (error) throw error;

      // Group by month
      const byMonth: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        if (!p.payment_date) return;
        const key = p.payment_date.substring(0, 7); // YYYY-MM
        byMonth[key] = (byMonth[key] || 0) + Number(p.amount || 0);
      });

      // Build array for last N months
      const result = [];
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        result.push({ month: key, label, revenue: byMonth[key] || 0 });
      }
      return result;
    },
  });
}

// Inventory usage - how many times each item was booked
export function useInventoryUsageReport(dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: ['inventory-usage-report', dateRange],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('rental_project_items')
        .select('inventory_item_id, quantity, inventory_items(name, sku, quantity_owned), rental_projects(start_date, status)');

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by item
      const usage: Record<string, {
        itemId: string;
        name: string;
        sku: string;
        totalOwned: number;
        timesBooked: number;
        totalQtyBooked: number;
        peakQty: number;
      }> = {};

      (data || []).forEach((row: any) => {
        if (!row.inventory_item_id || !row.inventory_items) return;
        const project = row.rental_projects;
        if (dateRange?.from && project?.start_date < dateRange.from) return;
        if (dateRange?.to && project?.start_date > dateRange.to) return;

        const id = row.inventory_item_id;
        if (!usage[id]) {
          usage[id] = {
            itemId: id,
            name: row.inventory_items.name,
            sku: row.inventory_items.sku || '',
            totalOwned: row.inventory_items.quantity_owned || 0,
            timesBooked: 0,
            totalQtyBooked: 0,
            peakQty: 0,
          };
        }
        usage[id].timesBooked += 1;
        usage[id].totalQtyBooked += Number(row.quantity || 0);
        usage[id].peakQty = Math.max(usage[id].peakQty, Number(row.quantity || 0));
      });

      return Object.values(usage).sort((a, b) => b.timesBooked - a.timesBooked);
    },
  });
}

// Due balances - projects with outstanding amounts
export function useDueBalancesReport() {
  return useQuery({
    queryKey: ['due-balances-report'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rental_projects')
        .select('*, rental_clients(name, email), rental_payments(amount, status, type)')
        .not('status', 'in', '("cancelled","lost")');

      if (error) throw error;

      return (data || [])
        .map((project: any) => {
          const payments = project.rental_payments || [];
          const paid = payments
            .filter((p: any) => p.status === 'completed' && p.type !== 'refund')
            .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
          const refunded = payments
            .filter((p: any) => p.type === 'refund' && p.status === 'completed')
            .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
          const total = Number(project.total || 0);
          const balance = total - paid + refunded;

          const daysOverdue = project.start_date
            ? Math.max(0, Math.floor((Date.now() - new Date(project.start_date + 'T00:00:00').getTime()) / 86400000))
            : 0;

          return {
            ...project,
            clientName: project.rental_clients?.name || 'No client',
            paid,
            refunded,
            balance,
            daysOverdue,
            agingBucket: daysOverdue <= 30 ? '0-30' : daysOverdue <= 60 ? '31-60' : '60+',
          };
        })
        .filter((p: any) => p.balance > 0.01)
        .sort((a: any, b: any) => b.balance - a.balance);
    },
  });
}

// Tax report - tax collected by period
export function useTaxReport(dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: ['tax-report', dateRange],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('rental_projects')
        .select('id, name, start_date, subtotal, tax_amount, total, rental_clients(name)')
        .gt('tax_amount', 0)
        .order('start_date', { ascending: false });

      if (dateRange?.from) query = query.gte('start_date', dateRange.from);
      if (dateRange?.to) query = query.lte('start_date', dateRange.to);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}
