'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

export interface InventoryAvailability {
  inventory_item_id: string;
  total_quantity: number;
  buffer_quantity: number;
  reserved_by_projects: number;
  reserved_by_set_asides: number;
  available_quantity: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export function useInventoryAvailability(dateRange?: DateRange) {
  const startDate = dateRange?.startDate
    ? format(dateRange.startDate, 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd');
  const endDate = dateRange?.endDate
    ? format(dateRange.endDate, 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['inventory_availability', startDate, endDate],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('get_inventory_availability' as any, {
        check_start: startDate,
        check_end: endDate,
      });

      if (error) throw error;
      return (data || []) as InventoryAvailability[];
    },
  });
}

export function useItemAvailability(itemId: string | undefined, dateRange?: DateRange) {
  const startDate = dateRange?.startDate
    ? format(dateRange.startDate, 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd');
  const endDate = dateRange?.endDate
    ? format(dateRange.endDate, 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['item_availability', itemId, startDate, endDate],
    queryFn: async () => {
      if (!itemId) return null;
      const supabase = createClient();
      const { data, error } = await supabase.rpc('calculate_availability' as any, {
        p_inventory_item_id: itemId,
        check_start: startDate,
        check_end: endDate,
      });

      if (error) throw error;
      return data as number;
    },
    enabled: !!itemId,
  });
}
