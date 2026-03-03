'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function useUpdateClientTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, tags }: { clientId: string; tags: string[] }) => {
      const supabase = createClient();
      const { error } = await supabase.from('rental_clients').update({ tags }).eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental_clients_full_stats'] });
    },
    onError: (err: Error) => toast.error(`Failed to update tags: ${err.message}`),
  });
}

export function useAddClientTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, tag, currentTags }: { clientId: string; tag: string; currentTags: string[] }) => {
      const supabase = createClient();
      const newTags = Array.from(new Set([...currentTags, tag]));
      const { error } = await supabase.from('rental_clients').update({ tags: newTags }).eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental_clients_full_stats'] });
    },
    onError: (err: Error) => toast.error(`Failed to add tag: ${err.message}`),
  });
}

export function useRemoveClientTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, tag, currentTags }: { clientId: string; tag: string; currentTags: string[] }) => {
      const supabase = createClient();
      const newTags = currentTags.filter((t) => t !== tag);
      const { error } = await supabase.from('rental_clients').update({ tags: newTags }).eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental_clients_full_stats'] });
    },
    onError: (err: Error) => toast.error(`Failed to remove tag: ${err.message}`),
  });
}

export function useBulkAddTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientIds, tag, clientsData }: {
      clientIds: string[];
      tag: string;
      clientsData: { id: string; tags: string[] }[];
    }) => {
      const supabase = createClient();
      const updates = clientIds.map(async (cid) => {
        const client = clientsData.find((c) => c.id === cid);
        const currentTags = client?.tags || [];
        const newTags = Array.from(new Set([...currentTags, tag]));
        return supabase.from('rental_clients').update({ tags: newTags }).eq('id', cid);
      });
      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) throw new Error(`Failed to update ${errors.length} clients`);
    },
    onSuccess: (_, { clientIds }) => {
      queryClient.invalidateQueries({ queryKey: ['rental_clients_full_stats'] });
      toast.success(`Added tag to ${clientIds.length} clients`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
