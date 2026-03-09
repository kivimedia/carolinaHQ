'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// ============================================================================
// Types
// ============================================================================

export interface MarqueeSet {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface MarqueeLetter {
  id: string;
  set_id: string;
  character: string;
  quantity: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface MarqueeBooking {
  id: string;
  set_id: string;
  text: string;
  letters_needed: Record<string, number>;
  event_date: string;
  end_date: string | null;
  card_id: string | null;
  proposal_id: string | null;
  client_name: string | null;
  event_name: string | null;
  status: 'reserved' | 'confirmed' | 'picked_up' | 'returned' | 'cancelled';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LetterAvailability {
  character: string;
  owned: number;
  booked: number;
  available: number;
}

// ============================================================================
// Utility
// ============================================================================

export function parseLettersNeeded(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const char of text.toUpperCase()) {
    if (/[A-Z0-9&#!/]/.test(char)) {
      counts[char] = (counts[char] || 0) + 1;
    }
  }
  return counts;
}

// ============================================================================
// Query Hooks
// ============================================================================

export function useMarqueeSets() {
  return useQuery({
    queryKey: ['marquee-sets'],
    queryFn: async (): Promise<MarqueeSet[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('marquee_sets')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return (data || []) as MarqueeSet[];
    },
  });
}

export function useMarqueeLetters(setId: string | undefined) {
  return useQuery({
    queryKey: ['marquee-letters', setId],
    enabled: !!setId,
    queryFn: async (): Promise<MarqueeLetter[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('marquee_letters')
        .select('*')
        .eq('set_id', setId!)
        .eq('is_active', true)
        .order('character');
      if (error) throw error;
      return (data || []) as MarqueeLetter[];
    },
  });
}

export function useMarqueeAvailability(date: string | undefined, setId: string | undefined) {
  return useQuery({
    queryKey: ['marquee-availability', date, setId],
    enabled: !!date && !!setId,
    queryFn: async (): Promise<LetterAvailability[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.rpc('marquee_availability', {
        check_date: date!,
        check_set_id: setId!,
      });
      if (error) throw error;
      return (data || []) as LetterAvailability[];
    },
  });
}

export function useMarqueeBookings(setId?: string) {
  return useQuery({
    queryKey: ['marquee-bookings', setId || 'all'],
    queryFn: async (): Promise<MarqueeBooking[]> => {
      const supabase = createBrowserSupabaseClient();
      let query = supabase
        .from('marquee_bookings')
        .select('*')
        .not('status', 'in', '("cancelled","returned")')
        .order('event_date', { ascending: true });

      if (setId) {
        query = query.eq('set_id', setId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MarqueeBooking[];
    },
  });
}

export function useAllMarqueeBookings() {
  return useQuery({
    queryKey: ['marquee-bookings-all'],
    queryFn: async (): Promise<MarqueeBooking[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('marquee_bookings')
        .select('*')
        .order('event_date', { ascending: true });
      if (error) throw error;
      return (data || []) as MarqueeBooking[];
    },
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (booking: {
      set_id: string;
      text: string;
      event_date: string;
      end_date?: string;
      card_id?: string;
      proposal_id?: string;
      client_name?: string;
      event_name?: string;
      notes?: string;
    }) => {
      const supabase = createBrowserSupabaseClient();
      const letters_needed = parseLettersNeeded(booking.text);

      const { data, error } = await supabase
        .from('marquee_bookings')
        .insert({
          ...booking,
          letters_needed,
          created_by: user?.id,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marquee-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['marquee-availability'] });
      toast.success('Letters reserved!');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MarqueeBooking['status'] }) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from('marquee_bookings')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marquee-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['marquee-availability'] });
      toast.success('Booking updated.');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useUpdateLetterQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ letterId, quantity }: { letterId: string; quantity: number }) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from('marquee_letters')
        .update({ quantity })
        .eq('id', letterId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marquee-letters'] });
      queryClient.invalidateQueries({ queryKey: ['marquee-availability'] });
      toast.success('Quantity updated.');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useCreateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const supabase = createBrowserSupabaseClient();

      // Create the set
      const { data: newSet, error } = await supabase
        .from('marquee_sets')
        .insert({ name, description })
        .select('id')
        .single();
      if (error) throw error;

      // Pre-fill with A-Z, 0-9, &, #, ! - all with quantity 0
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&#!'.split('');
      const letters = chars.map((c) => ({
        set_id: newSet.id,
        character: c,
        quantity: 0,
      }));

      const { error: lettersError } = await supabase.from('marquee_letters').insert(letters);
      if (lettersError) throw lettersError;

      return newSet.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marquee-sets'] });
      queryClient.invalidateQueries({ queryKey: ['marquee-letters'] });
      toast.success('New set created! Edit quantities to match your inventory.');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}
