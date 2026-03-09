'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ProposalTag {
  id: string;
  name: string;
  color: string;
  icon: string;
  display_order: number;
  user_id: string;
}

export function useTags() {
  return useQuery({
    queryKey: ['proposal-tags'],
    queryFn: async (): Promise<ProposalTag[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('proposal_tags')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return (data || []) as ProposalTag[];
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tag: { name: string; color: string; icon: string }) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from('proposal_tags').insert({
        ...tag,
        user_id: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-tags'] });
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string; icon?: string }) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from('proposal_tags').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-tags'] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from('proposal_tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-tags'] });
    },
  });
}

// Tag assignments for a proposal
export function useProposalTags(proposalId: string | undefined) {
  return useQuery({
    queryKey: ['proposal-tag-assignments', proposalId],
    enabled: !!proposalId,
    queryFn: async (): Promise<string[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('proposal_tag_assignments')
        .select('tag_id')
        .eq('proposal_id', proposalId!);
      if (error) throw error;
      return (data || []).map((d: any) => d.tag_id);
    },
  });
}

export function useSetProposalTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ proposalId, tagIds }: { proposalId: string; tagIds: string[] }) => {
      const supabase = createBrowserSupabaseClient();
      // Delete existing
      await supabase.from('proposal_tag_assignments').delete().eq('proposal_id', proposalId);
      // Insert new
      if (tagIds.length > 0) {
        const { error } = await supabase.from('proposal_tag_assignments').insert(
          tagIds.map((tag_id) => ({ proposal_id: proposalId, tag_id })) as any
        );
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-tag-assignments', vars.proposalId] });
      queryClient.invalidateQueries({ queryKey: ['all-proposal-tag-assignments'] });
    },
  });
}

// Bulk fetch all tag assignments for dashboard
export function useAllProposalTagAssignments() {
  return useQuery({
    queryKey: ['all-proposal-tag-assignments'],
    queryFn: async (): Promise<Record<string, string[]>> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('proposal_tag_assignments')
        .select('proposal_id, tag_id');
      if (error) throw error;
      const map: Record<string, string[]> = {};
      for (const row of data || []) {
        const r = row as any;
        if (!map[r.proposal_id]) map[r.proposal_id] = [];
        map[r.proposal_id].push(r.tag_id);
      }
      return map;
    },
  });
}
