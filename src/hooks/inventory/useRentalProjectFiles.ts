'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface RentalProjectFile {
  id: string;
  project_id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: string | null;
  is_signed: boolean;
  signed_at: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch files for an event
export function useRentalProjectFiles(projectId: string | undefined) {
  return useQuery({
    queryKey: ['rental_project_files', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const supabase = createClient();

      const { data, error } = await supabase
        .from('rental_project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as RentalProjectFile[];
    },
    enabled: !!projectId,
  });
}

// Upload and create file record
export function useCreateRentalProjectFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, file }: { projectId: string; file: File }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('rental-project-files')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('rental-project-files')
        .getPublicUrl(fileName);

      const size = file.size < 1024
        ? `${file.size} B`
        : file.size < 1024 * 1024
          ? `${(file.size / 1024).toFixed(0)} KB`
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      // Detect file type from name
      const lowerName = file.name.toLowerCase();
      let fileType = 'other';
      if (lowerName.includes('invoice')) fileType = 'invoice';
      else if (lowerName.includes('contract') || lowerName.includes('terms')) fileType = 'contract';
      else if (lowerName.includes('quote') || lowerName.includes('estimate')) fileType = 'quote';
      else if (lowerName.includes('receipt')) fileType = 'receipt';

      const { data, error } = await supabase
        .from('rental_project_files')
        .insert({
          project_id: projectId,
          name: file.name,
          file_url: publicUrl,
          file_type: fileType,
          file_size: size,
          uploaded_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as RentalProjectFile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rental_project_files', data.project_id] });
      toast.success('File uploaded');
    },
    onError: (err: Error) => toast.error(`Upload failed: ${err.message}`),
  });
}

// Delete file
export function useDeleteRentalProjectFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId, fileUrl }: { id: string; projectId: string; fileUrl: string }) => {
      const supabase = createClient();

      // Delete from storage
      const path = fileUrl.split('/rental-project-files/')[1];
      if (path) {
        await supabase.storage.from('rental-project-files').remove([path]);
      }

      const { error } = await supabase
        .from('rental_project_files')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ['rental_project_files', projectId] });
      toast.success('File deleted');
    },
    onError: (err: Error) => toast.error(`Failed to delete file: ${err.message}`),
  });
}
