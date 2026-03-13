'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { DbProduct } from '@/hooks/fun/use-products';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface DbProposal {
  id: string;
  proposal_number: string | null;
  status: string;
  confidence_tier: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  event_type: string | null;
  event_date: string | null;
  venue: string | null;
  guests: string | null;
  color_theme: string | null;
  notes: string | null;
  lead_source: string | null;
  subtotal: number | null;
  delivery_fee: number | null;
  total: number | null;
  total_override: number | null;
  personal_note: string | null;
  template_name: string | null;
  slug: string | null;
  created_at: string | null;
  updated_at: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  surcharges: unknown;
  discounts: unknown;
}

export function useProposals() {
  return useQuery({
    queryKey: ['proposals'],
    retry: 1,
    queryFn: async (): Promise<DbProposal[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as DbProposal[];
    },
  });
}

export function useSaveProposal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (proposal: {
      id?: string;
      client_name: string;
      client_email: string;
      client_phone: string;
      event_type: string;
      event_date: string;
      venue: string;
      start_time: string;
      guests: string;
      color_theme: string;
      notes: string;
      personal_note: string;
      lead_source?: string;
      subtotal: number;
      delivery_fee: number;
      total: number;
      total_override?: number | null;
      surcharges?: Array<{ name: string; amount: number }>;
      discounts?: Array<{ name: string; amount: number }>;
      selected_option_ids?: string[];
      image_display_mode?: string;
      gallery_layout?: string;
      lineItems: Array<{
        id: string;
        product_id: string;
        product_name: string;
        product_image?: string;
        selected_size: string;
        selected_color: string;
        quantity: number;
        unit_price: number;
        notes: string;
        display_order: number;
      }>;
    }) => {
      const supabase = createBrowserSupabaseClient();
      const { lineItems, id, selected_option_ids, ...proposalData } = proposal;

      let proposalId = id;

      const dbData = {
        client_name: proposalData.client_name,
        client_email: proposalData.client_email,
        client_phone: proposalData.client_phone,
        event_type: proposalData.event_type,
        event_date: proposalData.event_date || null,
        venue: proposalData.venue,
        start_time: proposalData.start_time,
        guests: proposalData.guests,
        color_theme: proposalData.color_theme,
        notes: proposalData.notes,
        personal_note: proposalData.personal_note,
        lead_source: proposalData.lead_source || '',
        subtotal: proposalData.subtotal,
        delivery_fee: proposalData.delivery_fee,
        total: proposalData.total,
        total_override: proposalData.total_override ?? null,
        surcharges: (proposalData.surcharges || []) as unknown,
        discounts: (proposalData.discounts || []) as unknown,
        selected_option_ids: selected_option_ids || [],
        image_display_mode: proposalData.image_display_mode || 'regular',
        gallery_layout: proposalData.gallery_layout || 'grid',
        user_id: user?.id,
        status: 'ready' as const,
      };

      if (proposalId) {
        const { error } = await supabase
          .from('proposals')
          .update(dbData)
          .eq('id', proposalId);
        if (error) throw error;

        await supabase.from('proposal_line_items').delete().eq('proposal_id', proposalId);
      } else {
        const { data, error } = await supabase
          .from('proposals')
          .insert(dbData)
          .select('id')
          .single();
        if (error) throw error;
        proposalId = data.id;
      }

      // Insert line items
      if (lineItems.length > 0) {
        const { error } = await supabase.from('proposal_line_items').insert(
          lineItems.map((item, i) => ({
            proposal_id: proposalId!,
            product_id: item.product_id,
            product_name: item.product_name,
            product_image: item.product_image,
            selected_size: item.selected_size,
            selected_color: item.selected_color,
            quantity: item.quantity,
            unit_price: item.unit_price,
            notes: item.notes,
            display_order: i,
          }))
        );
        if (error) throw error;
      }

      return proposalId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal saved and ready to send.');
    },
    onError: (error) => {
      toast.error(`Error saving: ${error.message}`);
    },
  });
}

export interface DbLineItem {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  selected_size: string | null;
  selected_color: string | null;
  quantity: number;
  unit_price: number;
  notes: string | null;
  display_order: number | null;
}

export function useProposal(id: string | undefined) {
  return useQuery({
    queryKey: ['proposal', id],
    enabled: !!id,
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data: proposal, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;

      const { data: items, error: itemsError } = await supabase
        .from('proposal_line_items')
        .select('*')
        .eq('proposal_id', id!)
        .order('display_order');
      if (itemsError) throw itemsError;

      return {
        proposal: proposal as DbProposal,
        lineItems: (items || []) as DbLineItem[],
      };
    },
  });
}

export function useDeleteProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      const supabase = createBrowserSupabaseClient();
      // Delete line items first
      await supabase.from('proposal_line_items').delete().eq('proposal_id', proposalId);
      // Delete the proposal
      const { error } = await supabase.from('proposals').delete().eq('id', proposalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal deleted');
    },
    onError: (e) => {
      toast.error(`Error deleting proposal: ${e.message}`);
    },
  });
}
