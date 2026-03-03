'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { RentalClient } from '@/lib/inventory/types';

// ── Paginated fetch helper ──────────────────────────────────────────────
async function fetchAllRows<T>(
  supabase: ReturnType<typeof createClient>,
  tableName: string,
  selectQuery: string,
  orderBy?: string,
): Promise<T[]> {
  const BATCH = 1000;
  const all: T[] = [];
  let offset = 0;
  let more = true;

  while (more) {
    let q = supabase
      .from(tableName)
      .select(selectQuery)
      .range(offset, offset + BATCH - 1) as any;
    if (orderBy) q = q.order(orderBy);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data || []) as T[];
    all.push(...rows);
    more = rows.length === BATCH;
    offset += BATCH;
  }
  return all;
}

// ── Types ───────────────────────────────────────────────────────────────
export type ClientWithFullStats = RentalClient & {
  project_count: number;
  total_revenue: number;
  total_paid: number;
  outstanding_balance: number;
  upcoming_events: number;
  last_activity_date: string | null;
};

// ── Fetch all clients with stats ────────────────────────────────────────
export function useClientsWithFullStats() {
  return useQuery({
    queryKey: ['rental_clients_full_stats'],
    queryFn: async (): Promise<ClientWithFullStats[]> => {
      const supabase = createClient();

      const [clients, projects, payments] = await Promise.all([
        fetchAllRows<RentalClient>(supabase, 'rental_clients', '*', 'name'),
        fetchAllRows<{
          id: string;
          client_id: string | null;
          total: number | null;
          start_date: string | null;
          status: string | null;
          updated_at: string | null;
        }>(supabase, 'rental_projects', 'id, client_id, total, start_date, status, updated_at'),
        fetchAllRows<{
          project_id: string;
          amount: number;
          payment_type: string;
          status: string;
        }>(supabase, 'rental_payments', 'project_id, amount, payment_type, status'),
      ]);

      const today = new Date().toISOString().split('T')[0];

      // Build stats per client
      const projectToClient = new Map<string, string>();
      const clientStats = new Map<string, {
        project_count: number;
        total_revenue: number;
        upcoming_events: number;
        last_activity_date: string | null;
      }>();

      (projects || []).forEach((p) => {
        if (p.client_id) {
          projectToClient.set(p.id, p.client_id);
          const s = clientStats.get(p.client_id) || {
            project_count: 0,
            total_revenue: 0,
            upcoming_events: 0,
            last_activity_date: null,
          };
          s.project_count += 1;
          s.total_revenue += p.total || 0;
          if (p.start_date && p.start_date >= today) s.upcoming_events += 1;
          if (!s.last_activity_date || (p.updated_at && p.updated_at > s.last_activity_date)) {
            s.last_activity_date = p.updated_at;
          }
          clientStats.set(p.client_id, s);
        }
      });

      // Payment totals per client
      const clientPayments = new Map<string, { paid: number; refunded: number }>();
      (payments || []).forEach((pay) => {
        const cid = projectToClient.get(pay.project_id);
        if (cid) {
          const cur = clientPayments.get(cid) || { paid: 0, refunded: 0 };
          if (pay.payment_type === 'payment' && pay.status === 'paid') cur.paid += pay.amount;
          else if (pay.payment_type === 'refund') cur.refunded += pay.amount;
          clientPayments.set(cid, cur);
        }
      });

      return (clients || []).map((c) => {
        const s = clientStats.get(c.id) || {
          project_count: 0,
          total_revenue: 0,
          upcoming_events: 0,
          last_activity_date: null,
        };
        const pd = clientPayments.get(c.id) || { paid: 0, refunded: 0 };
        const total_paid = pd.paid - pd.refunded;

        return {
          ...c,
          project_count: s.project_count,
          total_revenue: s.total_revenue,
          total_paid,
          outstanding_balance: s.total_revenue - total_paid,
          upcoming_events: s.upcoming_events,
          last_activity_date: s.last_activity_date,
        };
      });
    },
  });
}

// ── Derived stat hooks ──────────────────────────────────────────────────
export function useTopSpenders(limit = 10) {
  const { data: clients, ...rest } = useClientsWithFullStats();
  const topSpenders = clients
    ?.filter((c) => c.total_revenue > 0)
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, limit) || [];
  return { data: topSpenders, ...rest };
}

export function useTopRepeatClients(limit = 10) {
  const { data: clients, ...rest } = useClientsWithFullStats();
  const top = clients
    ?.filter((c) => c.project_count > 0)
    .sort((a, b) => b.project_count - a.project_count)
    .slice(0, limit) || [];
  return { data: top, ...rest };
}

export function useClientsWithOutstanding(limit = 10) {
  const { data: clients, ...rest } = useClientsWithFullStats();
  const out = clients
    ?.filter((c) => c.outstanding_balance > 0)
    .sort((a, b) => b.outstanding_balance - a.outstanding_balance)
    .slice(0, limit) || [];
  return { data: out, ...rest };
}

// ── CRUD ────────────────────────────────────────────────────────────────
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: Partial<RentalClient>) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rental_clients')
        .insert(client as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental_clients_full_stats'] });
      toast.success('Client created');
    },
    onError: () => toast.error('Failed to create client'),
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<RentalClient> & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rental_clients')
        .update(rest as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental_clients_full_stats'] });
      toast.success('Client updated');
    },
    onError: () => toast.error('Failed to update client'),
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('rental_clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental_clients_full_stats'] });
      toast.success('Client deleted');
    },
    onError: () => toast.error('Failed to delete client. They may have associated events.'),
  });
}
