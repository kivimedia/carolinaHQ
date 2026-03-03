'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface InvoiceScheduleItem {
  id: string;
  project_id: string;
  amount: number;
  due_date: string | null;
  scheduled_send_date: string | null;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled' | 'paid';
  sent_at: string | null;
  notes: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  invoice_number: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch invoice schedule for a project
export function useProjectInvoiceSchedule(projectId: string | undefined) {
  return useQuery({
    queryKey: ['invoice_schedule', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('invoice_schedule')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return (data || []) as InvoiceScheduleItem[];
    },
    enabled: !!projectId,
  });
}

// Create invoice split
export function useCreateInvoiceSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (split: {
      project_id: string;
      amount: number;
      due_date?: string | null;
      scheduled_send_date?: string | null;
      recipient_email?: string | null;
      recipient_name?: string | null;
      notes?: string | null;
    }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('invoice_schedule')
        .insert({
          ...split,
          status: 'draft',
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['invoice_schedule', vars.project_id] });
      toast.success('Invoice split created');
    },
    onError: (err: Error) => toast.error(`Failed to create split: ${err.message}`),
  });
}

// Update invoice split
export function useUpdateInvoiceSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, project_id, ...updates }: {
      id: string;
      project_id: string;
      amount?: number;
      due_date?: string | null;
      status?: string;
      notes?: string | null;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('invoice_schedule')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoice_schedule', data.project_id] });
    },
    onError: (err: Error) => toast.error(`Failed to update split: ${err.message}`),
  });
}

// Delete invoice split
export function useDeleteInvoiceSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('invoice_schedule')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoice_schedule', data.project_id] });
      toast.success('Invoice split deleted');
    },
    onError: (err: Error) => toast.error(`Failed to delete split: ${err.message}`),
  });
}

// Mark invoice as sent
export function useMarkInvoiceSent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('invoice_schedule')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoice_schedule', data.project_id] });
      toast.success('Invoice marked as sent');
    },
    onError: (err: Error) => toast.error(`Failed to update invoice: ${err.message}`),
  });
}
