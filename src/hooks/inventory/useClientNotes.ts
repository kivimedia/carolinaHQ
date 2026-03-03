'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface ClientNote {
  id: string;
  client_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useClientNotes(clientId: string | undefined) {
  return useQuery({
    queryKey: ['rental_client_notes', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const supabase = createClient();

      const { data: notes, error } = await supabase
        .from('rental_client_notes')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!notes || notes.length === 0) return [];

      // Fetch user profiles for note authors
      const userIds = Array.from(new Set(notes.map((n) => n.user_id)));
      let profilesMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        if (profiles) {
          profiles.forEach((p) => {
            profilesMap.set(p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url });
          });
        }
      }

      return notes.map((note) => ({
        ...note,
        user_profile: profilesMap.get(note.user_id) || null,
      })) as ClientNote[];
    },
    enabled: !!clientId,
  });
}

export function useAddClientNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, content }: { clientId: string; content: string }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('rental_client_notes')
        .insert({ client_id: clientId, user_id: user.id, content })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['rental_client_notes', vars.clientId] });
    },
  });
}

export function useUpdateClientNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, content, clientId }: { noteId: string; content: string; clientId: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rental_client_notes')
        .update({ content })
        .eq('id', noteId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['rental_client_notes', vars.clientId] });
    },
  });
}

export function useDeleteClientNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, clientId }: { noteId: string; clientId: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from('rental_client_notes').delete().eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['rental_client_notes', vars.clientId] });
    },
  });
}
