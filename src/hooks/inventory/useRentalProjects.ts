'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { RentalProject, RentalProjectStatus } from '@/lib/inventory/types';

export type RentalProjectWithClient = RentalProject & {
  rental_clients: { id: string; name: string; email: string | null; phone: string | null } | null;
};

// Fetch all rental projects with client info
export function useRentalProjects() {
  return useQuery({
    queryKey: ['rental_projects'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rental_projects')
        .select(`
          *,
          rental_clients (id, name, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as RentalProjectWithClient[];
    },
    staleTime: 1000 * 60,
  });
}

// Fetch a single rental project with all details
export function useRentalProject(id: string | undefined) {
  return useQuery({
    queryKey: ['rental_projects', id],
    queryFn: async () => {
      if (!id) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rental_projects')
        .select(`
          *,
          rental_clients (*),
          rental_project_items (
            *,
            inventory_items (*)
          ),
          rental_project_policies (
            *,
            policies (*)
          ),
          rental_payments (*),
          contract_signatures (*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// Create a draft event
export function useCreateDraftEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('rental_projects')
        .insert({
          name: 'Untitled Event',
          status: 'draft' as RentalProjectStatus,
          created_by: user?.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Auto-assign default policies
      const { data: defaultPolicies } = await supabase
        .from('policies')
        .select('id, type')
        .eq('is_default', true)
        .eq('is_active', true);

      if (defaultPolicies && defaultPolicies.length > 0) {
        const policyByType: Record<string, string> = {};
        for (const policy of defaultPolicies) {
          if (!policyByType[policy.type]) {
            policyByType[policy.type] = policy.id;
          }
        }
        const projectPolicies = Object.values(policyByType).map(policyId => ({
          project_id: data.id,
          policy_id: policyId,
        }));
        if (projectPolicies.length > 0) {
          await supabase.from('rental_project_policies').insert(projectPolicies);
        }
      }

      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental_projects'] });
      toast.success('Draft event created');
    },
    onError: (err: Error) => toast.error(`Failed to create event: ${err.message}`),
  });
}

// Create event with full details
export function useCreateRentalProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: Partial<RentalProject>) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('rental_projects')
        .insert({ ...project, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental_projects'] });
      toast.success('Event created');
    },
    onError: (err: Error) => toast.error(`Failed to create event: ${err.message}`),
  });
}

// Update event
export function useUpdateRentalProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...project }: Partial<RentalProject> & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rental_projects')
        .update(project)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rental_projects'] });
      queryClient.invalidateQueries({ queryKey: ['rental_projects', variables.id] });
    },
    onError: (err: Error) => toast.error(`Failed to update event: ${err.message}`),
  });
}

// Delete event
export function useDeleteRentalProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('rental_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental_projects'] });
      toast.success('Event deleted');
    },
    onError: (err: Error) => toast.error(`Failed to delete event: ${err.message}`),
  });
}

// Event status counts
export function useEventStatusCounts() {
  return useQuery({
    queryKey: ['rental_projects', 'status-counts'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rental_projects')
        .select('status');

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach(row => {
        counts[row.status] = (counts[row.status] || 0) + 1;
      });
      return counts;
    },
    staleTime: 1000 * 60,
  });
}
