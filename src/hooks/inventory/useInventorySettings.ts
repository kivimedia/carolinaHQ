'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { InventorySettings } from '@/lib/inventory/types';

export type { InventorySettings };

export interface CategoryBufferSetting {
  id: string;
  category_id: string;
  buffer_quantity: number;
  buffer_percentage: number;
  use_percentage: boolean;
  pre_buffer_time: number;
  post_buffer_time: number;
  created_at: string;
  updated_at: string;
  inventory_categories?: { id: string; name: string };
}

export const useInventorySettings = () => {
  return useQuery({
    queryKey: ['inventory_settings'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inventory_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as InventorySettings;
    },
  });
};

export const useUpdateInventorySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<InventorySettings> & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inventory_settings')
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_settings'] });
      toast.success('Inventory settings saved');
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });
};

export const useCategoryBufferSettings = () => {
  return useQuery({
    queryKey: ['category_buffer_settings'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('category_buffer_settings')
        .select(`*, inventory_categories (id, name)`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as CategoryBufferSetting[];
    },
  });
};

export const useUpsertCategoryBuffer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      setting: Omit<CategoryBufferSetting, 'id' | 'created_at' | 'updated_at' | 'inventory_categories'>
    ) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('category_buffer_settings')
        .upsert(setting, { onConflict: 'category_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_buffer_settings'] });
      toast.success('Category buffer saved');
    },
    onError: (error) => {
      toast.error('Failed to save category buffer: ' + error.message);
    },
  });
};

export const useDeleteCategoryBuffer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('category_buffer_settings')
        .delete()
        .eq('category_id', categoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_buffer_settings'] });
      toast.success('Category buffer removed');
    },
    onError: (error) => {
      toast.error('Failed to remove category buffer: ' + error.message);
    },
  });
};
