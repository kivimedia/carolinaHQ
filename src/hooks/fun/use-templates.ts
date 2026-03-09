'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { DbOption } from '@/hooks/fun/use-options';

export interface TemplateLineItem {
  product_id: string;
  product_name: string;
  selected_size: string;
  selected_color: string;
  quantity: number;
  unit_price: number;
}

export interface TemplateOption {
  option_id: string;
  display_order: number;
  price_override: number | null;
}

export interface DbTemplate {
  id: string;
  name: string;
  description: string;
  event_types: string[];
  colors: string[];
  is_default: boolean;
  default_line_items: TemplateLineItem[];
  default_personal_note: string;
  default_notes: string;
  default_delivery_fee: number;
  default_surcharges: Array<{ name: string; amount: number }>;
  default_discounts: Array<{ name: string; amount: number }>;
  created_at: string;
  updated_at: string;
  options: TemplateOption[];
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async (): Promise<DbTemplate[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('proposal_templates')
        .select('*')
        .order('created_at');
      if (error) throw error;

      const templateIds = (data || []).map((t: any) => t.id);
      const { data: allOptions } = templateIds.length > 0
        ? await supabase.from('template_options').select('*').in('template_id', templateIds)
        : { data: [] };

      return (data || []).map((t: any) => mapTemplate(t, allOptions || []));
    },
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['templates', id],
    enabled: !!id,
    queryFn: async (): Promise<DbTemplate | null> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('proposal_templates')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: opts } = await supabase
        .from('template_options')
        .select('*')
        .eq('template_id', id!)
        .order('display_order');

      return mapTemplate(data, opts || []);
    },
  });
}

function mapTemplate(t: any, allTemplateOptions: any[]): DbTemplate {
  const templateOpts = allTemplateOptions
    .filter((o: any) => o.template_id === t.id)
    .map((o: any) => ({
      option_id: o.option_id,
      display_order: o.display_order || 0,
      price_override: o.price_override,
    }));

  return {
    id: t.id,
    name: t.name,
    description: t.description || '',
    event_types: t.event_types || [],
    colors: t.colors || [],
    is_default: t.is_default ?? false,
    default_line_items: (t.default_line_items as TemplateLineItem[]) || [],
    default_personal_note: t.default_personal_note || '',
    default_notes: t.default_notes || '',
    default_delivery_fee: t.default_delivery_fee || 0,
    default_surcharges: (t.default_surcharges as any[]) || [],
    default_discounts: (t.default_discounts as any[]) || [],
    created_at: t.created_at,
    updated_at: t.updated_at,
    options: templateOpts,
  };
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (template: Partial<DbTemplate> & { id?: string }) => {
      const supabase = createBrowserSupabaseClient();
      const { id, created_at, updated_at, options, ...rest } = template as any;
      const payload = {
        ...rest,
        default_line_items: rest.default_line_items || [],
        default_surcharges: rest.default_surcharges || [],
        default_discounts: rest.default_discounts || [],
      };
      // Remove 'options' from payload since it's not a column
      delete payload.options;

      let templateId = id;
      if (templateId) {
        const { error } = await supabase
          .from('proposal_templates')
          .update(payload)
          .eq('id', templateId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('proposal_templates')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        templateId = data.id;
      }

      // Sync template_options
      if (options !== undefined) {
        await supabase.from('template_options').delete().eq('template_id', templateId);
        if (options && options.length > 0) {
          const { error } = await supabase.from('template_options').insert(
            options.map((o: TemplateOption, i: number) => ({
              template_id: templateId,
              option_id: o.option_id,
              display_order: i,
              price_override: o.price_override,
            }))
          );
          if (error) throw error;
        }
      }

      return templateId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template saved');
    },
    onError: (e) => {
      toast.error(`Error saving template: ${e.message}`);
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from('proposal_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted');
    },
  });
}

export function useDuplicateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (source: DbTemplate) => {
      const supabase = createBrowserSupabaseClient();
      const { id, created_at, updated_at, ...rest } = source;
      const { error } = await supabase.from('proposal_templates').insert({
        ...rest,
        name: `${rest.name} (Copy)`,
        is_default: false,
        default_line_items: rest.default_line_items as any,
        default_surcharges: rest.default_surcharges as any,
        default_discounts: rest.default_discounts as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template duplicated');
    },
  });
}
