'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface OptionItem {
  id: string;
  option_id: string;
  product_id: string | null;
  product_name: string;
  selected_size: string;
  selected_color: string;
  quantity: number;
  unit_price: number;
  display_order: number;
}

export interface DbOption {
  id: string;
  name: string;
  description: string;
  display_price: number;
  is_active: boolean;
  display_order: number;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  items: OptionItem[];
  /** Computed inner total from line items */
  inner_total: number;
}

export function useOptions() {
  return useQuery({
    queryKey: ['options'],
    queryFn: async (): Promise<DbOption[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data: options, error } = await supabase
        .from('proposal_options')
        .select('*')
        .order('display_order');
      if (error) throw error;

      const { data: items, error: itemsError } = await supabase
        .from('proposal_option_items')
        .select('*')
        .order('display_order');
      if (itemsError) throw itemsError;

      return (options || []).map((opt: any) => {
        const optItems = (items || []).filter((i: any) => i.option_id === opt.id) as OptionItem[];
        const inner_total = optItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
        return {
          ...opt,
          description: opt.description || '',
          display_price: opt.display_price || 0,
          is_active: opt.is_active ?? true,
          display_order: opt.display_order || 0,
          items: optItems,
          inner_total,
        } as DbOption;
      });
    },
  });
}

export function useOption(id: string | undefined) {
  return useQuery({
    queryKey: ['options', id],
    enabled: !!id,
    queryFn: async (): Promise<DbOption | null> => {
      const supabase = createBrowserSupabaseClient();
      const { data: opt, error } = await supabase
        .from('proposal_options')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!opt) return null;

      const { data: items, error: itemsError } = await supabase
        .from('proposal_option_items')
        .select('*')
        .eq('option_id', id!)
        .order('display_order');
      if (itemsError) throw itemsError;

      const optItems = (items || []) as OptionItem[];
      const inner_total = optItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);

      return {
        ...opt,
        description: opt.description || '',
        display_price: opt.display_price || 0,
        is_active: opt.is_active ?? true,
        display_order: opt.display_order || 0,
        items: optItems,
        inner_total,
      } as DbOption;
    },
  });
}

export function useSaveOption() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (option: {
      id?: string;
      name: string;
      description: string;
      display_price: number;
      is_active?: boolean;
      items: Array<{
        product_id: string | null;
        product_name: string;
        selected_size: string;
        selected_color: string;
        quantity: number;
        unit_price: number;
      }>;
    }) => {
      const supabase = createBrowserSupabaseClient();
      const { items, id, ...rest } = option;
      const payload = { ...rest, user_id: user?.id };

      let optionId = id;
      if (optionId) {
        const { error } = await supabase
          .from('proposal_options')
          .update(payload)
          .eq('id', optionId);
        if (error) throw error;
        await supabase.from('proposal_option_items').delete().eq('option_id', optionId);
      } else {
        const { data, error } = await supabase
          .from('proposal_options')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        optionId = data.id;
      }

      if (items.length > 0) {
        const { error } = await supabase.from('proposal_option_items').insert(
          items.map((item, i) => ({
            option_id: optionId!,
            product_id: item.product_id,
            product_name: item.product_name,
            selected_size: item.selected_size,
            selected_color: item.selected_color,
            quantity: item.quantity,
            unit_price: item.unit_price,
            display_order: i,
          }))
        );
        if (error) throw error;
      }

      return optionId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['options'] });
      toast.success('Option saved');
    },
    onError: (e) => {
      toast.error(`Error saving option: ${e.message}`);
    },
  });
}

export function useDeleteOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from('proposal_options').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['options'] });
      toast.success('Option deleted');
    },
  });
}

export function useDuplicateOption() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (sourceId: string) => {
      const supabase = createBrowserSupabaseClient();
      // Fetch original option
      const { data: orig, error } = await supabase
        .from('proposal_options')
        .select('*')
        .eq('id', sourceId)
        .single();
      if (error) throw error;

      // Fetch original items
      const { data: origItems, error: itemsErr } = await supabase
        .from('proposal_option_items')
        .select('*')
        .eq('option_id', sourceId)
        .order('display_order');
      if (itemsErr) throw itemsErr;

      // Insert copy
      const { data: newOpt, error: insertErr } = await supabase
        .from('proposal_options')
        .insert({
          name: `Copy of ${orig.name}`,
          description: orig.description,
          display_price: orig.display_price,
          display_order: orig.display_order,
          is_active: orig.is_active,
          user_id: user?.id,
        })
        .select('id')
        .single();
      if (insertErr) throw insertErr;

      // Copy items
      if (origItems && origItems.length > 0) {
        const { error: copyErr } = await supabase
          .from('proposal_option_items')
          .insert(
            origItems.map((item: any, i: number) => ({
              option_id: newOpt.id,
              product_id: item.product_id,
              product_name: item.product_name,
              selected_size: item.selected_size,
              selected_color: item.selected_color,
              quantity: item.quantity,
              unit_price: item.unit_price,
              display_order: i,
            }))
          );
        if (copyErr) throw copyErr;
      }

      return newOpt.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['options'] });
      toast.success('Option duplicated');
    },
    onError: (e) => {
      toast.error(`Error duplicating option: ${e.message}`);
    },
  });
}
