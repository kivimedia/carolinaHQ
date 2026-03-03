'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface FinancialOverviewStats {
  totalRevenue: number;
  totalPaid: number;
  totalOutstanding: number;
  totalRefunded: number;
  activeEvents: number;
  completedEvents: number;
  paymentsThisMonth: number;
  revenueThisMonth: number;
}

// Fetch financial overview stats
export function useFinancialOverview() {
  return useQuery({
    queryKey: ['financial_overview'],
    queryFn: async () => {
      const supabase = createClient();

      // Get all projects totals
      const { data: projects } = await supabase
        .from('rental_projects')
        .select('id, total, status');

      // Get all payments
      const { data: payments } = await supabase
        .from('rental_payments')
        .select('id, amount, status, payment_type, created_at');

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const totalRevenue = (projects || []).reduce((sum, p) => sum + (p.total || 0), 0);
      const completedPayments = (payments || []).filter(p => p.status === 'completed' && p.payment_type !== 'refund');
      const refunds = (payments || []).filter(p => p.payment_type === 'refund');

      const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalRefunded = refunds.reduce((sum, p) => sum + p.amount, 0);
      const totalOutstanding = totalRevenue - totalPaid + totalRefunded;

      const activeEvents = (projects || []).filter(
        p => ['confirmed', 'in_progress', 'signed', 'billing'].includes(p.status)
      ).length;
      const completedEvents = (projects || []).filter(p => p.status === 'completed').length;

      const paymentsThisMonth = completedPayments.filter(p => p.created_at >= monthStart).length;
      const revenueThisMonth = completedPayments
        .filter(p => p.created_at >= monthStart)
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        totalRevenue,
        totalPaid,
        totalOutstanding: Math.max(0, totalOutstanding),
        totalRefunded,
        activeEvents,
        completedEvents,
        paymentsThisMonth,
        revenueThisMonth,
      } as FinancialOverviewStats;
    },
    staleTime: 1000 * 60 * 2,
  });
}

// Fetch recent payments with project + client info
export function useRecentPayments(limit = 10) {
  return useQuery({
    queryKey: ['recent_payments', limit],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rental_payments')
        .select(`
          *,
          rental_projects (id, name, client_id, rental_clients (id, name))
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch due balances (projects with outstanding balance)
export function useDueBalances() {
  return useQuery({
    queryKey: ['due_balances'],
    queryFn: async () => {
      const supabase = createClient();

      // Get all non-cancelled/archived projects with totals
      const { data: projects } = await supabase
        .from('rental_projects')
        .select(`
          id, name, total, start_date, status,
          rental_clients (id, name, email, phone)
        `)
        .not('status', 'in', '("cancelled","archived","lost")')
        .gt('total', 0);

      if (!projects || projects.length === 0) return [];

      // Get all payments grouped by project
      const { data: payments } = await supabase
        .from('rental_payments')
        .select('project_id, amount, status, payment_type');

      const paymentsByProject = new Map<string, { paid: number; refunded: number }>();
      (payments || []).forEach(p => {
        const existing = paymentsByProject.get(p.project_id) || { paid: 0, refunded: 0 };
        if (p.status === 'completed' && p.payment_type !== 'refund') {
          existing.paid += p.amount;
        }
        if (p.payment_type === 'refund') {
          existing.refunded += p.amount;
        }
        paymentsByProject.set(p.project_id, existing);
      });

      return projects
        .map(p => {
          const pmt = paymentsByProject.get(p.id) || { paid: 0, refunded: 0 };
          const outstanding = (p.total || 0) - pmt.paid + pmt.refunded;
          return { ...p, paid: pmt.paid, outstanding };
        })
        .filter(p => p.outstanding > 0.01)
        .sort((a, b) => b.outstanding - a.outstanding);
    },
  });
}
