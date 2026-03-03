'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface ContractSignature {
  id: string;
  project_id: string;
  token: string;
  signer_name: string | null;
  signer_email: string | null;
  signature_data: string | null;
  signed_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  status: 'pending' | 'signed' | 'expired' | 'revoked';
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch latest contract signature for a project
export function useLatestContractSignature(projectId: string | undefined) {
  return useQuery({
    queryKey: ['contract_signatures', projectId, 'latest'],
    queryFn: async () => {
      if (!projectId) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('contract_signatures')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ContractSignature | null;
    },
    enabled: !!projectId,
  });
}

// Fetch all signatures for a project
export function useContractSignatures(projectId: string | undefined) {
  return useQuery({
    queryKey: ['contract_signatures', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('contract_signatures')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ContractSignature[];
    },
    enabled: !!projectId,
  });
}

// Create a new signing link
export function useCreateSignatureLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, expiresInDays = 30 }: { projectId: string; expiresInDays?: number }) => {
      const supabase = createClient();

      // Generate random token
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { data, error } = await supabase
        .from('contract_signatures')
        .insert({
          project_id: projectId,
          token,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as ContractSignature;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['contract_signatures', vars.projectId] });
      toast.success('Signing link created');
    },
    onError: (err: Error) => toast.error(`Failed to create link: ${err.message}`),
  });
}

// Revoke a signing link
export function useRevokeSignatureLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ signatureId, projectId }: { signatureId: string; projectId: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('contract_signatures')
        .update({ status: 'revoked' })
        .eq('id', signatureId);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contract_signatures', data.projectId] });
      toast.success('Signing link revoked');
    },
    onError: (err: Error) => toast.error(`Failed to revoke link: ${err.message}`),
  });
}
