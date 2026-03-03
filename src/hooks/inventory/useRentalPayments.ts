'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { RentalPayment } from '@/lib/inventory/types';

// Fetch all payments
export function useRentalPayments() {
  return useQuery({
    queryKey: ['rental_payments'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rental_payments')
        .select(`
          *,
          rental_projects(id, name, client_id, rental_clients(id, name, email, phone))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch payments for a specific event
export function useEventPayments(projectId: string | undefined) {
  return useQuery({
    queryKey: ['rental_payments', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const supabase = createClient();

      const { data, error } = await supabase
        .from('rental_payments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as RentalPayment[];
    },
    enabled: !!projectId,
  });
}

// Create payment
export function useCreateRentalPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: {
      project_id: string;
      amount: number;
      payment_type: string;
      payment_method?: string | null;
      status?: string;
      paid_date?: string | null;
      due_date?: string | null;
      notes?: string | null;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rental_payments')
        .insert(payment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rental_payments', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['rental_payments'] });
      queryClient.invalidateQueries({ queryKey: ['rental_projects', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['rental_projects'] });
      queryClient.invalidateQueries({ queryKey: ['rental_clients_full_stats'] });
      toast.success('Payment recorded');
    },
    onError: (err: Error) => toast.error(`Failed to record payment: ${err.message}`),
  });
}

// Update payment
export function useUpdateRentalPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, project_id, ...payment }: {
      id: string;
      project_id: string;
      amount?: number;
      payment_method?: string | null;
      status?: string;
      paid_date?: string | null;
      notes?: string | null;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rental_payments')
        .update(payment)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rental_payments', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['rental_payments'] });
      queryClient.invalidateQueries({ queryKey: ['rental_projects', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['rental_projects'] });
      queryClient.invalidateQueries({ queryKey: ['rental_clients_full_stats'] });
    },
    onError: (err: Error) => toast.error(`Failed to update payment: ${err.message}`),
  });
}

// Delete payment
export function useDeleteRentalPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('rental_payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rental_payments', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['rental_payments'] });
      queryClient.invalidateQueries({ queryKey: ['rental_projects', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['rental_projects'] });
      queryClient.invalidateQueries({ queryKey: ['rental_clients_full_stats'] });
      toast.success('Payment deleted');
    },
    onError: (err: Error) => toast.error(`Failed to delete payment: ${err.message}`),
  });
}

// Mark payment as paid
export function useMarkPaymentPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      project_id,
      payment_method,
      paid_date,
      notes,
    }: {
      id: string;
      project_id: string;
      payment_method?: string;
      paid_date?: string;
      notes?: string;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rental_payments')
        .update({
          status: 'completed',
          payment_method,
          paid_date: paid_date || new Date().toISOString().split('T')[0],
          notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rental_payments', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['rental_payments'] });
      queryClient.invalidateQueries({ queryKey: ['rental_projects', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['rental_projects'] });
      queryClient.invalidateQueries({ queryKey: ['rental_clients_full_stats'] });
      toast.success('Payment marked as paid');
    },
    onError: (err: Error) => toast.error(`Failed to update payment: ${err.message}`),
  });
}
