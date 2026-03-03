'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function useCompanySettings() {
  return useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const supabase = createClient();
      const { data: existing } = await supabase.from('company_settings').select('id').maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('company_settings')
          .update(updates)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_settings')
          .insert(updates);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_settings'] });
      toast.success('Company settings saved');
    },
    onError: (err: any) => toast.error(`Failed to save: ${err.message}`),
  });
}

export function useUploadCompanyLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `company-logo/logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(path);

      const { data: existing } = await supabase.from('company_settings').select('id').maybeSingle();
      if (existing) {
        await supabase.from('company_settings').update({ logo_url: publicUrl }).eq('id', existing.id);
      } else {
        await supabase.from('company_settings').insert({ logo_url: publicUrl });
      }

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_settings'] });
      toast.success('Logo uploaded');
    },
    onError: (err: any) => toast.error(`Failed to upload: ${err.message}`),
  });
}
