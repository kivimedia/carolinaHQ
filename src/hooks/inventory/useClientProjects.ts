'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { RentalProject } from '@/lib/inventory/types';

export type ProjectWithPayments = RentalProject & {
  total_paid: number;
  outstanding_balance: number;
};

export function useClientProjects(clientId: string | undefined) {
  return useQuery({
    queryKey: ['rental_client_projects', clientId],
    queryFn: async (): Promise<ProjectWithPayments[]> => {
      if (!clientId) return [];
      const supabase = createClient();

      const { data: projects, error: pErr } = await supabase
        .from('rental_projects')
        .select('*')
        .eq('client_id', clientId)
        .order('start_date', { ascending: false });
      if (pErr) throw pErr;
      if (!projects || projects.length === 0) return [];

      const projectIds = projects.map((p) => p.id);
      const { data: payments, error: payErr } = await supabase
        .from('rental_payments')
        .select('project_id, amount, payment_type, status')
        .in('project_id', projectIds);
      if (payErr) throw payErr;

      const ppMap = new Map<string, number>();
      (payments || []).forEach((pay) => {
        const cur = ppMap.get(pay.project_id) || 0;
        if (pay.payment_type === 'payment' && pay.status === 'paid') ppMap.set(pay.project_id, cur + pay.amount);
        else if (pay.payment_type === 'refund') ppMap.set(pay.project_id, cur - pay.amount);
      });

      return projects.map((p) => {
        const total_paid = ppMap.get(p.id) || 0;
        return { ...p, total_paid, outstanding_balance: (p.total || 0) - total_paid };
      }) as ProjectWithPayments[];
    },
    enabled: !!clientId,
  });
}

export function useClientProjectsByStatus(clientId: string | undefined) {
  const { data: projects, ...rest } = useClientProjects(clientId);
  const today = new Date().toISOString().split('T')[0];

  const categorized = {
    upcoming: [] as ProjectWithPayments[],
    active: [] as ProjectWithPayments[],
    past: [] as ProjectWithPayments[],
    all: projects || [],
  };

  projects?.forEach((p) => {
    if (p.status === 'in_progress' || p.status === 'confirmed') {
      categorized.active.push(p);
    } else if (
      p.start_date && p.start_date >= today &&
      p.status !== 'cancelled' && p.status !== 'completed'
    ) {
      categorized.upcoming.push(p);
    } else if (
      p.status === 'completed' || p.status === 'cancelled' ||
      (p.end_date && p.end_date < today)
    ) {
      categorized.past.push(p);
    } else {
      categorized.upcoming.push(p);
    }
  });

  return { data: categorized, ...rest };
}
