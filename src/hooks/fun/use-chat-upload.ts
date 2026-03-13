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

  // Convert a data URI or external URL to a File for upload
  const urlToFile = useCallback(async (src: string): Promise<File | null> => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const ext = blob.type.split('/')[1] || 'png';
      return new File([blob], `pasted-${Date.now()}.${ext}`, { type: blob.type });
    } catch {
      return null;
    }
  }, []);

  // Extract image sources from pasted HTML (Google Docs, web pages, etc.)
  const extractImagesFromHtml = useCallback((html: string): string[] => {
    const srcs: string[] = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      srcs.push(match[1]);
    }
    return srcs;
  }, []);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    // Strategy 1: Direct file blobs (screenshots, right-click-copied images)
    const files = Array.from(e.clipboardData.files).filter((f) =>
      f.type.startsWith('image/')
    );

    // Strategy 2: Images embedded in HTML (Google Docs, web copy)
    const html = e.clipboardData.getData('text/html');
    const htmlImageSrcs = html ? extractImagesFromHtml(html) : [];

    if (files.length === 0 && htmlImageSrcs.length === 0) return;

    e.preventDefault();
    setUploading(true);

    const urls: string[] = [];

    // Upload direct file blobs
    for (const file of files) {
      const url = await uploadImage(file);
      if (url) urls.push(url);
    }

    // Upload images extracted from HTML (skip if we already got files - avoids duplicates)
    if (files.length === 0 && htmlImageSrcs.length > 0) {
      for (const src of htmlImageSrcs) {
        const file = await urlToFile(src);
        if (file) {
          const url = await uploadImage(file);
          if (url) urls.push(url);
        }
      }
    }

    if (urls.length > 0) {
      setPendingImages((prev) => [...prev, ...urls]);
    }
    setUploading(false);
  }, [uploadImage, urlToFile, extractImagesFromHtml]);

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
