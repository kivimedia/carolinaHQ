'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useAddPackageContentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      packageId,
      inventoryItemId,
      quantity = 1,
    }: {
      packageId: string;
      inventoryItemId: string;
      quantity?: number;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inventory_package_items')
        .insert({
          package_id: packageId,
          inventory_item_id: inventoryItemId,
          quantity,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory_packages'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_packages', variables.packageId] });
      queryClient.refetchQueries({ queryKey: ['inventory_packages'] });
      queryClient.refetchQueries({ queryKey: ['inventory_packages', variables.packageId] });
    },
  });
}
