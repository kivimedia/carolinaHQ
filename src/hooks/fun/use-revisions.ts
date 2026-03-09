'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface ProposalRevision {
  id: string;
  proposal_id: string;
  revision_number: number;
  snapshot: Record<string, any>;
  created_at: string;
}

export function useRevisions(proposalId: string | undefined) {
  return useQuery({
    queryKey: ['revisions', proposalId],
    enabled: !!proposalId,
    queryFn: async (): Promise<ProposalRevision[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('proposal_revisions')
        .select('*')
        .eq('proposal_id', proposalId!)
        .order('revision_number', { ascending: false });
      if (error) throw error;
      return (data || []) as ProposalRevision[];
    },
  });
}

export function useSaveRevision() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      snapshot,
    }: {
      proposalId: string;
      snapshot: Record<string, any>;
    }) => {
      const supabase = createBrowserSupabaseClient();
      // Get the next revision number
      const { data: latest } = await supabase
        .from('proposal_revisions')
        .select('revision_number')
        .eq('proposal_id', proposalId)
        .order('revision_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextNum = (latest?.revision_number || 0) + 1;

      const { error } = await supabase.from('proposal_revisions').insert({
        proposal_id: proposalId,
        revision_number: nextNum,
        snapshot: snapshot as unknown,
      });
      if (error) throw error;
      return nextNum;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['revisions', vars.proposalId] });
    },
  });
}
