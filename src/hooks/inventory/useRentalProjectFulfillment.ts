'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ProjectItemFulfillment } from '@/lib/inventory/types';

// Fetch fulfillment states for all items in an event
export function useRentalProjectFulfillment(projectId: string | undefined) {
  return useQuery({
    queryKey: ['rental_project_fulfillment', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const supabase = createClient();

      const { data: projectItems, error: itemsError } = await supabase
        .from('rental_project_items')
        .select('id')
        .eq('project_id', projectId);

      if (itemsError) throw itemsError;
      if (!projectItems || projectItems.length === 0) return [];

      const itemIds = projectItems.map(item => item.id);

      const { data, error } = await supabase
        .from('rental_project_item_fulfillment')
        .select('*')
        .in('project_item_id', itemIds);

      if (error) throw error;
      return (data || []) as ProjectItemFulfillment[];
    },
    enabled: !!projectId,
  });
}

// Toggle a single fulfillment flag
export function useUpdateFulfillmentState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectItemId,
      field,
      value,
      projectId,
    }: {
      projectItemId: string;
      field: 'is_pulled' | 'is_prepped' | 'is_loaded';
      value: boolean;
      projectId: string;
    }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const timestampField = field.replace('is_', '') + '_at';
      const byField = field.replace('is_', '') + '_by';

      const { data, error } = await supabase
        .from('rental_project_item_fulfillment')
        .upsert(
          {
            project_item_id: projectItemId,
            [field]: value,
            [timestampField]: value ? new Date().toISOString() : null,
            [byField]: value ? user?.id || null : null,
          },
          { onConflict: 'project_item_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return { data, projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['rental_project_fulfillment', result.projectId] });
    },
  });
}

// Bulk update fulfillment for multiple items
export function useBulkUpdateFulfillment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectItemIds,
      field,
      value,
      projectId,
    }: {
      projectItemIds: string[];
      field: 'is_pulled' | 'is_prepped' | 'is_loaded';
      value: boolean;
      projectId: string;
    }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const timestampField = field.replace('is_', '') + '_at';
      const byField = field.replace('is_', '') + '_by';

      const upsertData = projectItemIds.map(id => ({
        project_item_id: id,
        [field]: value,
        [timestampField]: value ? new Date().toISOString() : null,
        [byField]: value ? user?.id || null : null,
      }));

      const { error } = await supabase
        .from('rental_project_item_fulfillment')
        .upsert(upsertData, { onConflict: 'project_item_id' });

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['rental_project_fulfillment', result.projectId] });
    },
  });
}
