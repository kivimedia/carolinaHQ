'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Surcharge {
  label: string;
  value: string;
  enabled: boolean;
}

export interface UserSettings {
  id: string;
  user_id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  minimum_orders: Record<string, number>;
  surcharges: Surcharge[];
  item_label: string;
  logo_url: string;
  ai_master_prompt: string;
  allow_item_removal: boolean;
}

const DEFAULT_SETTINGS: Omit<UserSettings, 'id' | 'user_id'> = {
  business_name: '',
  contact_name: '',
  email: '',
  phone: '',
  minimum_orders: { Birthday: 300, Corporate: 500, Wedding: 500, Other: 300 },
  surcharges: [
    { label: 'Weekend premium', value: '$50', enabled: true },
    { label: 'Rush order (< 48hrs)', value: '+15%', enabled: true },
    { label: 'Holiday premium', value: '$75', enabled: false },
  ],
  item_label: 'designs',
  logo_url: '',
  ai_master_prompt: '',
  allow_item_removal: true,
};

export function useUserSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-settings', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<UserSettings> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create default settings for user
        const { data: created, error: insertError } = await supabase
          .from('user_settings')
          .insert({ user_id: user!.id, ...DEFAULT_SETTINGS } as any)
          .select('*')
          .single();
        if (insertError) throw insertError;
        return created as unknown as UserSettings;
      }

      return data as unknown as UserSettings;
    },
  });
}

export function useSaveUserSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: Partial<Omit<UserSettings, 'id' | 'user_id'>>) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from('user_settings')
        .update(settings as any)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings', user?.id] });
      toast.success('Settings saved');
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
}
