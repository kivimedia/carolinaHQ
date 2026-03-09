'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function useAcceptProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from('proposals')
        .update({
          status: 'accepted' as any,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', proposalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal accepted! Status updated.');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}
