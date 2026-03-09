'use client';

import { useState, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function useChatUpload() {
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const ext = file.type.split('/')[1] || 'png';
      const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from('chat-uploads')
        .upload(path, file, { contentType: file.type, upsert: true });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      const { data } = supabase.storage.from('chat-uploads').getPublicUrl(path);
      return data.publicUrl;
    } catch (err) {
      console.error('Upload failed:', err);
      return null;
    }
  }, []);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files).filter((f) =>
      f.type.startsWith('image/')
    );
    if (files.length === 0) return;

    e.preventDefault();
    setUploading(true);

    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadImage(file);
      if (url) urls.push(url);
    }

    if (urls.length > 0) {
      setPendingImages((prev) => [...prev, ...urls]);
    }
    setUploading(false);
  }, [uploadImage]);

  const removeImage = useCallback((index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearPendingImages = useCallback(() => {
    setPendingImages([]);
  }, []);

  return {
    pendingImages,
    uploading,
    handlePaste,
    removeImage,
    clearPendingImages,
  };
}
