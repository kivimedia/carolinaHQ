'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { InventoryPackage, InventoryPackageItem } from '@/lib/inventory/types';

export type { InventoryPackage, InventoryPackageItem };

export function useInventoryPackages() {
  return useQuery({
    queryKey: ['inventory_packages'],
    queryFn: async () => {
      const supabase = createClient();
      let allPackages: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('inventory_packages')
          .select(`
            *,
            category:inventory_categories(id, name),
            items:inventory_package_items (
              *,
              inventory_item:inventory_items (*)
            )
          `)
          .order('name')
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allPackages = [...allPackages, ...data];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      return allPackages as InventoryPackage[];
    },
  });
}

export function useInventoryPackage(id: string | undefined) {
  return useQuery({
    queryKey: ['inventory_packages', id],
    queryFn: async () => {
      if (!id) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inventory_packages')
        .select(`
          *,
          category:inventory_categories(id, name),
          items:inventory_package_items (
            *,
            inventory_item:inventory_items (*)
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as InventoryPackage | null;
    },
    enabled: !!id,
  });
}

export function useCreatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pkg: {
      name: string;
      description?: string;
      sku?: string;
      price: number;
      discount_type?: string;
      discount_value?: number;
      is_active?: boolean;
      category_id?: string | null;
      items?: { inventory_item_id: string; quantity: number }[];
    }) => {
      const supabase = createClient();
      const { items, ...packageData } = pkg;

      const { data: newPackage, error: packageError } = await supabase
        .from('inventory_packages')
        .insert(packageData)
        .select()
        .single();

      if (packageError) throw packageError;

      if (items && items.length > 0) {
        const packageItems = items.map(item => ({
          package_id: newPackage.id,
          inventory_item_id: item.inventory_item_id,
          quantity: item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from('inventory_package_items')
          .insert(packageItems);
        if (itemsError) throw itemsError;
      }

      return newPackage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_packages'] });
      queryClient.refetchQueries({ queryKey: ['inventory_packages'] });
    },
  });
}

export function useUpdatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      items,
      ...packageData
    }: {
      id: string;
      name?: string;
      description?: string | null;
      sku?: string | null;
      price?: number;
      discount_type?: string;
      category_id?: string | null;
      discount_value?: number;
      is_active?: boolean;
      items?: { inventory_item_id: string; quantity: number }[];
    }) => {
      const supabase = createClient();
      const { error: packageError } = await supabase
        .from('inventory_packages')
        .update(packageData)
        .eq('id', id);

      if (packageError) throw packageError;

      if (items !== undefined) {
        await supabase.from('inventory_package_items').delete().eq('package_id', id);
        if (items.length > 0) {
          const packageItems = items.map(item => ({
            package_id: id,
            inventory_item_id: item.inventory_item_id,
            quantity: item.quantity,
          }));
          const { error: itemsError } = await supabase
            .from('inventory_package_items')
            .insert(packageItems);
          if (itemsError) throw itemsError;
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory_packages'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_packages', variables.id] });
      queryClient.refetchQueries({ queryKey: ['inventory_packages', variables.id] });
      queryClient.refetchQueries({ queryKey: ['inventory_packages'] });
    },
  });
}

export function useDeletePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('inventory_packages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_packages'] });
      queryClient.refetchQueries({ queryKey: ['inventory_packages'] });
    },
  });
}
