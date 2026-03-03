'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { RentalPolicy, PolicyType } from '@/lib/inventory/types';

// Fetch policies, optionally filtered by type
export function usePolicies(type?: PolicyType) {
  return useQuery({
    queryKey: ['policies', type || 'all'],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('policies')
        .select('*')
        .order('display_order', { ascending: true });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RentalPolicy[];
    },
  });
}

// Create policy
export function useCreatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policy: {
      name: string;
      type: PolicyType;
      content: string;
      description?: string | null;
      is_active?: boolean;
      is_default?: boolean;
    }) => {
      const supabase = createClient();

      // If setting as default, unset others
      if (policy.is_default) {
        await supabase
          .from('policies')
          .update({ is_default: false })
          .eq('type', policy.type)
          .eq('is_default', true);
      }

      const { data, error } = await supabase
        .from('policies')
        .insert(policy)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success('Policy created');
    },
    onError: (err: Error) => toast.error(`Failed to create policy: ${err.message}`),
  });
}

// Update policy
export function useUpdatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      content?: string;
      description?: string | null;
      is_active?: boolean;
      is_default?: boolean;
      type?: PolicyType;
    }) => {
      const supabase = createClient();

      if (updates.is_default && updates.type) {
        await supabase
          .from('policies')
          .update({ is_default: false })
          .eq('type', updates.type)
          .neq('id', id)
          .eq('is_default', true);
      }

      const { data, error } = await supabase
        .from('policies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success('Policy updated');
    },
    onError: (err: Error) => toast.error(`Failed to update policy: ${err.message}`),
  });
}

// Delete policy
export function useDeletePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('policies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success('Policy deleted');
    },
    onError: (err: Error) => toast.error(`Failed to delete policy: ${err.message}`),
  });
}

// Reorder policies
export function useReorderPolicies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const supabase = createClient();
      const updates = orderedIds.map((id, i) =>
        supabase.from('policies').update({ display_order: i }).eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}
