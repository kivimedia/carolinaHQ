'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useItemAccessoryRelations(inventoryItemId: string | undefined) {
  return useQuery({
    queryKey: ['item_accessory_relations', inventoryItemId],
    queryFn: async () => {
      if (!inventoryItemId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inventory_item_accessories')
        .select(`
          id,
          inventory_item_id,
          accessory_of_package_id,
          quantity,
          accessory_of_package:inventory_packages!inventory_item_accessories_accessory_of_package_id_fkey (
            id, name, sku, price, is_active
          )
        `)
        .eq('inventory_item_id', inventoryItemId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!inventoryItemId,
  });
}

export function usePackageAccessories(packageId: string | undefined) {
  return useQuery({
    queryKey: ['package_accessories', packageId],
    queryFn: async () => {
      if (!packageId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inventory_item_accessories')
        .select(`
          id,
          inventory_item_id,
          accessory_of_package_id,
          quantity,
          accessory_item:inventory_items!inventory_item_accessories_inventory_item_id_fkey (
            id, name, sku, rate, item_type, image_url
          )
        `)
        .eq('accessory_of_package_id', packageId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!packageId,
  });
}

export function useAddAccessoryRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inventoryItemId,
      accessoryOfPackageId,
      quantity = 1,
    }: {
      inventoryItemId: string;
      accessoryOfPackageId: string;
      quantity?: number;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inventory_item_accessories')
        .insert({
          inventory_item_id: inventoryItemId,
          accessory_of_package_id: accessoryOfPackageId,
          quantity,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['item_accessory_relations', variables.inventoryItemId] });
      queryClient.invalidateQueries({ queryKey: ['package_accessories', variables.accessoryOfPackageId] });
      queryClient.invalidateQueries({ queryKey: ['inventory_packages'] });
      queryClient.refetchQueries({ queryKey: ['package_accessories', variables.accessoryOfPackageId] });
      queryClient.refetchQueries({ queryKey: ['inventory_packages'] });
    },
  });
}

export function useRemoveAccessoryRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (relationId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('inventory_item_accessories')
        .delete()
        .eq('id', relationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item_accessory_relations'] });
      queryClient.invalidateQueries({ queryKey: ['package_accessories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_packages'] });
      queryClient.refetchQueries({ queryKey: ['inventory_packages'] });
    },
  });
}
