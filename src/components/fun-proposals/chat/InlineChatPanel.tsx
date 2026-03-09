'use client';

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Trash2, Sparkles, Mic, MicOff, Maximize2, Minimize2, History, Plus, ChevronLeft, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui-shadcn/button";
import { useChat } from "@/hooks/fun/use-chat";
import { useChatUpload } from "@/hooks/fun/use-chat-upload";
import ChatMessage from "./ChatMessage";
import { formatDistanceToNow } from "date-fns";

const SUGGESTIONS = [
  "Create a proposal for a birthday party with garland and columns",
  "Show me all wedding templates",
  "Generate an image for a balloon arch product",
  "Create an option package with garland, wall, and centerpieces",
];

export default function InlineChatPanel() {
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    conversations,
    loadingConversations,
    loadConversation,
    deleteConversation,
    conversationId,
  } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const { pendingImages, uploading, handlePaste, removeImage, clearPendingImages } = useChatUpload();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    if ((!input.trim() && pendingImages.length === 0) || isLoading) return;
    recognitionRef.current?.stop();
    setIsRecording(false);
    sendMessage(input.trim(), pendingImages.length > 0 ? pendingImages : undefined);
    setInput("");
    clearPendingImages();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = input;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + transcript;
        } else {
          interim += transcript;
        }
      }
      setInput(finalTranscript + (interim ? " " + interim : ""));
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const handleNewChat = () => {
    clearChat();
    setShowHistory(false);
  };

  const handleSelectConversation = (convId: string) => {
    loadConversation(convId);
    setShowHistory(false);
  };

  const panelHeight = expanded ? 720 : 480;

  return (
    <div
      className="flex flex-col rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 overflow-hidden"
      style={{ height: panelHeight }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          {showHistory ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowHistory(false)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Sparkles className="h-5 w-5 text-primary" />
          )}
          <h3 className="font-display text-sm font-semibold text-foreground">
            {showHistory ? "Chat History" : "AI Assistant"}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {!showHistory && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowHistory(true)}
                title="Conversation history"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNewChat}
                title="New conversation"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Shrink" : "Expand"}
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          {!showHistory && messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearChat} title="Clear chat">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {showHistory ? (
        /* History sidebar */
        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingConversations ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No conversations yet. Start chatting!
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-center gap-2 px-5 py-3 cursor-pointer hover:bg-muted/50 transition-colors group ${
                    conv.id === conversationId ? "bg-muted" : ""
                  }`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {conv.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    title="Delete conversation"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 min-h-0">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="space-y-3 py-2">
                  <p className="text-center text-sm text-muted-foreground">
                    Tell me what you need - I can create proposals, manage products, options, templates, and generate images.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setInput(s);
                          inputRef.current?.focus();
                        }}
                        className="rounded-full border border-border bg-background px-4 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors whitespace-nowrap"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="rounded-2xl border border-border bg-background px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            <div className="relative flex items-end gap-2">
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                className="h-11 w-11 shrink-0 rounded-2xl"
                onClick={toggleRecording}
                title={isRecording ? "Stop recording" : "Record voice message"}
              >
                {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={uploading ? "Uploading image..." : isRecording ? "Listening..." : "Describe what you need..."}
                rows={2}
                className="flex-1 resize-none rounded-2xl border-2 border-primary/30 bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                style={{ maxHeight: 140 }}
              />

              {/* Pending image previews */}
              {pendingImages.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-2 flex flex-wrap gap-2 px-1">
                  {pendingImages.map((url, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={url}
                        alt={`Pending ${i + 1}`}
                        className="h-16 w-16 rounded-lg object-cover border border-border shadow-sm"
                      />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >
                        x
                      </button>
                    </div>
                  ))}
                  {uploading && (
                    <div className="h-16 w-16 rounded-lg border border-border bg-muted flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
              <Button
                size="icon"
                className="h-11 w-11 shrink-0 rounded-2xl shadow-md"
                onClick={handleSend}
                disabled={(!input.trim() && pendingImages.length === 0) || isLoading || uploading}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
