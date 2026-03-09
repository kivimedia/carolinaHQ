'use client';

import { useState, useCallback, useEffect } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  images?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('chat_conversations' as any)
        .select('id, title, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setConversations((data as any[] || []).map((c: any) => ({
        id: c.id,
        title: c.title || 'Untitled',
        created_at: c.created_at,
      })));
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load a specific conversation's messages
  const loadConversation = useCallback(async (convId: string) => {
    setConversationId(convId);
    setIsLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('chat_messages' as any)
        .select('id, role, content, created_at, metadata')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      const msgs: ChatMessage[] = (data as any[] || []).map((m: any) => {
        const imageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
        const images: string[] = [];
        let match;
        while ((match = imageRegex.exec(m.content)) !== null) {
          images.push(match[1]);
        }
        return {
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          created_at: m.created_at,
          images: images.length > 0 ? images : undefined,
        };
      });

      setMessages(msgs);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ensureConversation = useCallback(async (firstMessage: string) => {
    if (conversationId) return conversationId;

    const supabase = createBrowserSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? '...' : '');

    const { data, error } = await supabase
      .from('chat_conversations' as any)
      .insert({ user_id: session.user.id, title } as any)
      .select('id')
      .single();

    if (error) throw error;
    const id = (data as any).id;
    setConversationId(id);

    // Add to conversations list
    setConversations(prev => [{
      id,
      title,
      created_at: new Date().toISOString(),
    }, ...prev]);

    return id;
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string, images?: string[]) => {
    if (!content.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      images: images && images.length > 0 ? images : undefined,
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const convId = await ensureConversation(content);

      // Build messages array for API
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Include image URLs in the payload
      const imageUrls = images && images.length > 0 ? images : undefined;

      const response = await fetch('/api/proposals/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          conversation_id: convId,
          images: imageUrls,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed: ${response.status}`);
      }

      const data = await response.json();

      // Extract image URLs from markdown
      const imageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
      const extractedImages: string[] = [];
      let match;
      while ((match = imageRegex.exec(data.content)) !== null) {
        extractedImages.push(match[1]);
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
        created_at: new Date().toISOString(),
        images: extractedImages.length > 0 ? extractedImages : undefined,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${err.message || 'Something went wrong. Please try again.'}`,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, ensureConversation]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  const deleteConversation = useCallback(async (convId: string) => {
    const supabase = createBrowserSupabaseClient();
    await supabase.from('chat_conversations' as any).delete().eq('id', convId);
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (conversationId === convId) {
      setMessages([]);
      setConversationId(null);
    }
  }, [conversationId]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    conversations,
    loadingConversations,
    loadConversation,
    deleteConversation,
    conversationId,
    loadConversations,
  };
}
