'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function useEmailSettings() {
  return useQuery({
    queryKey: ['email_settings'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateEmailSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const supabase = createClient();
      const { data: existing } = await supabase.from('email_settings').select('id').maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('email_settings')
          .update(updates)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('email_settings').insert(updates);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_settings'] });
      toast.success('Email settings saved');
    },
    onError: (err: any) => toast.error(`Failed to save: ${err.message}`),
  });
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: async (toEmail: string) => {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toEmail }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send test email');
      }
    },
    onSuccess: () => toast.success('Test email sent!'),
    onError: (err: any) => toast.error(err.message),
  });
}
