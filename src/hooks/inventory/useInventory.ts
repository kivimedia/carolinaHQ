'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { InventoryItem } from '@/lib/inventory/types';

export function useInventoryItems(options?: {
  categoryId?: string | null;
  search?: string;
  showArchived?: boolean;
}) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['inventory-items', options],
    queryFn: async () => {
      let query = supabase
        .from('inventory_items')
        .select(`
          *,
          category:inventory_categories!category_id(id, name, icon),
          sub_category:inventory_categories!sub_category_id(id, name),
          images:inventory_item_images(id, image_url, is_primary, display_order)
        `)
        .order('name');

      if (!options?.showArchived) {
        query = query.is('archived_at', null);
      }

      if (options?.categoryId) {
        query = query.or(`category_id.eq.${options.categoryId},sub_category_id.eq.${options.categoryId}`);
      }

      if (options?.search) {
        query = query.or(`name.ilike.%${options.search}%,sku.ilike.%${options.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as InventoryItem[];
    },
    staleTime: 60 * 1000,
  });
}

export function useInventoryItem(id: string | undefined) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['inventory-item', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          category:inventory_categories!category_id(id, name, icon),
          sub_category:inventory_categories!sub_category_id(id, name),
          images:inventory_item_images(id, image_url, is_primary, display_order)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as InventoryItem;
    },
    enabled: !!id,
  });
}

export function useCreateInventoryItem() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Partial<InventoryItem>) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          name: item.name!,
          sku: item.sku,
          description: item.description,
          status: item.status || 'available',
          quantity: item.quantity || 0,
          available_quantity: item.available_quantity || item.quantity || 0,
          buffer_quantity: item.buffer_quantity || 0,
          rate: item.rate || 0,
          rate_type: item.rate_type || 'per_day',
          item_type: item.item_type || 'product',
          category_id: item.category_id,
          sub_category_id: item.sub_category_id,
          image_url: item.image_url,
          location: item.location,
          internal_notes: item.internal_notes,
          notes: item.notes,
          tags: item.tags,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    },
  });
}

export function useUpdateInventoryItem() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InventoryItem> }) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-item', data.id] });
    },
  });
}

export function useDeleteInventoryItem() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('inventory_items')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    },
  });
}
