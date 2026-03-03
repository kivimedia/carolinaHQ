'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { RentalProjectItem } from '@/lib/inventory/types';

export type ProjectItemWithDetails = RentalProjectItem & {
  inventory_items?: {
    id: string;
    name: string;
    sku: string | null;
    image_url: string | null;
    quantity: number;
    rate: number;
  } | null;
  inventory_packages?: {
    id: string;
    name: string;
    image_url: string | null;
  } | null;
};

// Fetch project items for an event
export function useRentalProjectItems(projectId: string | undefined) {
  return useQuery({
    queryKey: ['rental_project_items', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const supabase = createClient();

      const { data, error } = await supabase
        .from('rental_project_items')
        .select(`
          *,
          inventory_items (id, name, sku, image_url, quantity, rate),
          inventory_packages (id, name, image_url)
        `)
        .eq('project_id', projectId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as ProjectItemWithDetails[];
    },
    enabled: !!projectId,
  });
}

// Add item to event
export function useCreateRentalProjectItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: {
      project_id: string;
      name: string;
      inventory_item_id?: string | null;
      package_id?: string | null;
      quantity: number;
      rate: number;
      amount: number;
      category?: string | null;
      description?: string | null;
      item_type?: string | null;
      is_service?: boolean | null;
      line_item_group_id?: string | null;
      display_order?: number | null;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rental_project_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return { ...data, project_id: item.project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rental_project_items', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['rental_projects', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['rental_projects'] });
      toast.success('Item added to event');
    },
    onError: (err: Error) => toast.error(`Failed to add item: ${err.message}`),
  });
}

// Update event item
export function useUpdateRentalProjectItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, project_id, ...item }: {
      id: string;
      project_id: string;
      name?: string;
      quantity?: number;
      rate?: number;
      amount?: number;
      category?: string | null;
      description?: string | null;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rental_project_items')
        .update(item)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rental_project_items', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['rental_projects', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['rental_projects'] });
    },
    onError: (err: Error) => toast.error(`Failed to update item: ${err.message}`),
  });
}

// Delete event item
export function useDeleteRentalProjectItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('rental_project_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rental_project_items', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['rental_projects', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['rental_projects'] });
    },
    onError: (err: Error) => toast.error(`Failed to remove item: ${err.message}`),
  });
}

// Recalculate event totals
export function useRecalculateEventTotals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, taxRate = 0 }: { projectId: string; taxRate?: number }) => {
      const supabase = createClient();

      const { data: items, error: itemsError } = await supabase
        .from('rental_project_items')
        .select('amount, item_type, category')
        .eq('project_id', projectId);

      if (itemsError) throw itemsError;

      const subtotal = items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

      // Only tax non-logistics items
      const taxableSubtotal = items?.reduce((sum, item) => {
        const isLogistics = item.item_type === 'delivery_logistics' ||
          ['delivery', 'logistics', 'pickup'].some(k => (item.category || '').toLowerCase().includes(k));
        return sum + (isLogistics ? 0 : (item.amount || 0));
      }, 0) || 0;

      const { data: project, error: projectError } = await supabase
        .from('rental_projects')
        .select('discount_amount, tax_rate')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      const discountAmount = project?.discount_amount || 0;
      const rate = taxRate || project?.tax_rate || 0;
      const taxableAmount = taxableSubtotal - discountAmount;
      const taxAmount = Math.max(0, taxableAmount) * rate;
      const total = taxableAmount + taxAmount;

      const { error: updateError } = await supabase
        .from('rental_projects')
        .update({ subtotal, tax_amount: taxAmount, total })
        .eq('id', projectId);

      if (updateError) throw updateError;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rental_projects', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['rental_projects'] });
    },
  });
}

// Reorder items
export function useReorderRentalProjectItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ items, projectId }: { items: { id: string; display_order: number }[]; projectId: string }) => {
      const supabase = createClient();
      const updates = items.map(({ id, display_order }) =>
        supabase
          .from('rental_project_items')
          .update({ display_order } as any)
          .eq('id', id)
      );
      await Promise.all(updates);
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rental_project_items', data.projectId] });
    },
  });
}
