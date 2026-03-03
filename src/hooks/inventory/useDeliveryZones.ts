'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function useDeliveryZones() {
  return useQuery({
    queryKey: ['delivery_zones'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateDeliveryZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (zone: {
      name: string;
      zip_codes: string[];
      base_rate: number;
      per_mile_rate?: number;
      minimum_fee?: number;
      is_active?: boolean;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from('delivery_zones').insert(zone);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_zones'] });
      toast.success('Delivery zone created');
    },
    onError: (err: any) => toast.error(`Failed to create zone: ${err.message}`),
  });
}

export function useUpdateDeliveryZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const supabase = createClient();
      const { error } = await supabase.from('delivery_zones').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_zones'] });
      toast.success('Delivery zone updated');
    },
    onError: (err: any) => toast.error(`Failed to update zone: ${err.message}`),
  });
}

export function useDeleteDeliveryZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_zones'] });
      toast.success('Delivery zone deleted');
    },
    onError: (err: any) => toast.error(`Failed to delete zone: ${err.message}`),
  });
}

export function findZoneByZipCode(zones: any[], zipCode: string) {
  return zones.find((zone: any) =>
    (zone.zip_codes || []).some((zc: string) => {
      if (zc.endsWith('*')) {
        return zipCode.startsWith(zc.slice(0, -1));
      }
      return zc === zipCode;
    })
  );
}
