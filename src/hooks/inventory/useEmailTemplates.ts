'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export type EmailTemplateType = 'quote' | 'invoice' | 'contract' | 'payment_confirmation' | 'reminder';

export interface EmailTemplate {
  id: string;
  name: string;
  template_type: EmailTemplateType;
  subject: string;
  body_content: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch email templates
export function useEmailTemplates(type?: EmailTemplateType) {
  return useQuery({
    queryKey: ['email_templates', type || 'all'],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (type) {
        query = query.eq('template_type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EmailTemplate[];
    },
  });
}

// Create email template
export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: {
      name: string;
      template_type: EmailTemplateType;
      subject: string;
      body_content: string;
      is_default?: boolean;
    }) => {
      const supabase = createClient();

      if (template.is_default) {
        await supabase
          .from('email_templates')
          .update({ is_default: false })
          .eq('template_type', template.template_type)
          .eq('is_default', true);
      }

      const { data, error } = await supabase
        .from('email_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      toast.success('Email template created');
    },
    onError: (err: Error) => toast.error(`Failed to create template: ${err.message}`),
  });
}

// Update email template
export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      subject?: string;
      body_content?: string;
      is_default?: boolean;
      is_active?: boolean;
      template_type?: EmailTemplateType;
    }) => {
      const supabase = createClient();

      if (updates.is_default && updates.template_type) {
        await supabase
          .from('email_templates')
          .update({ is_default: false })
          .neq('id', id)
          .eq('template_type', updates.template_type)
          .eq('is_default', true);
      }

      const { data, error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      toast.success('Template updated');
    },
    onError: (err: Error) => toast.error(`Failed to update template: ${err.message}`),
  });
}

// Delete email template
export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      toast.success('Template deleted');
    },
    onError: (err: Error) => toast.error(`Failed to delete template: ${err.message}`),
  });
}
