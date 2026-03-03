'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { TaxRate } from '@/lib/inventory/types';

// Fetch all tax rates
export function useTaxRates() {
  return useQuery({
    queryKey: ['tax_rates'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as TaxRate[];
    },
  });
}

// Create tax rate
export function useCreateTaxRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rate: {
      name: string;
      rate: number;
      jurisdiction?: string | null;
      is_default?: boolean;
      is_active?: boolean;
    }) => {
      const supabase = createClient();

      // If this is set as default, unset other defaults first
      if (rate.is_default) {
        await supabase
          .from('tax_rates')
          .update({ is_default: false })
          .eq('is_default', true);
      }

      const { data, error } = await supabase
        .from('tax_rates')
        .insert(rate)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax_rates'] });
      toast.success('Tax rate created');
    },
    onError: (err: Error) => toast.error(`Failed to create tax rate: ${err.message}`),
  });
}

// Update tax rate
export function useUpdateTaxRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      rate?: number;
      jurisdiction?: string | null;
      is_default?: boolean;
      is_active?: boolean;
    }) => {
      const supabase = createClient();

      // If setting as default, unset other defaults first
      if (updates.is_default) {
        await supabase
          .from('tax_rates')
          .update({ is_default: false })
          .neq('id', id)
          .eq('is_default', true);
      }

      const { data, error } = await supabase
        .from('tax_rates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax_rates'] });
      toast.success('Tax rate updated');
    },
    onError: (err: Error) => toast.error(`Failed to update tax rate: ${err.message}`),
  });
}

// Delete tax rate
export function useDeleteTaxRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('tax_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax_rates'] });
      toast.success('Tax rate deleted');
    },
    onError: (err: Error) => toast.error(`Failed to delete tax rate: ${err.message}`),
  });
}
