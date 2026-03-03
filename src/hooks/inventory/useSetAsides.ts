'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SetAside } from '@/lib/inventory/types';

export type { SetAside };

export interface CreateSetAsideInput {
  inventory_item_id: string;
  quantity: number;
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface UpdateSetAsideInput {
  id: string;
  quantity?: number;
  reason?: string | null;
}

export function useSetAsides() {
  return useQuery({
    queryKey: ['set_asides'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('set_asides')
        .select(`*, inventory_items (id, name, sku)`)
        .order('start_date', { ascending: true })
        .range(0, 9999);

      if (error) throw error;
      return (data || []) as SetAside[];
    },
  });
}

export function useItemSetAsides(itemId: string | undefined) {
  return useQuery({
    queryKey: ['set_asides', 'item', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('set_asides')
        .select('*')
        .eq('inventory_item_id', itemId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return (data || []) as SetAside[];
    },
    enabled: !!itemId,
  });
}

export function useCreateSetAside() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSetAsideInput) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('set_asides')
        .insert({ ...input, created_by: user?.id || null })
        .select()
        .single();

      if (error) throw error;
      return data as SetAside;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['set_asides'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_availability'] });
      queryClient.invalidateQueries({ queryKey: ['item_availability'] });
    },
  });
}

export function useUpdateSetAside() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateSetAsideInput) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('set_asides')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SetAside;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['set_asides'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_availability'] });
      queryClient.invalidateQueries({ queryKey: ['item_availability'] });
    },
  });
}

export function useDeleteSetAside() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('set_asides').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['set_asides'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_availability'] });
      queryClient.invalidateQueries({ queryKey: ['item_availability'] });
    },
  });
}
