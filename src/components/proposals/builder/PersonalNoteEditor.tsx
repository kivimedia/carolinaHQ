'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui-shadcn/textarea';

interface PersonalNoteEditorProps {
  note: string;
  onChange: (note: string) => void;
  clientName?: string;
  eventType?: string;
}

export default function PersonalNoteEditor({ note, onChange, clientName, eventType }: PersonalNoteEditorProps) {
  const [generating, setGenerating] = useState(false);

  const generateNote = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/proposals/builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_note',
          clientName: clientName || 'the client',
          eventType: eventType || 'event',
        }),
      });
      const data = await res.json();
      if (data.data?.note) {
        onChange(data.data.note);
      } else {
        // Fallback note if AI generation not available
        const name = clientName || 'there';
        const event = eventType?.replace(/_/g, ' ') || 'upcoming event';
        onChange(
          `Hi ${name}! Thank you so much for considering Carolina Balloons for your ${event}! I'm so excited to help make your celebration absolutely stunning. I've put together this proposal based on our conversation, and I think you're going to love what we have planned. Please don't hesitate to reach out if you'd like to adjust anything - I want this to be perfect for you!`
        );
      }
    } catch {
      const name = clientName || 'there';
      const event = eventType?.replace(/_/g, ' ') || 'upcoming event';
      onChange(
        `Hi ${name}! Thank you so much for considering Carolina Balloons for your ${event}! I'm so excited to help make your celebration absolutely stunning. I've put together this proposal based on our conversation, and I think you're going to love what we have planned. Please don't hesitate to reach out if you'd like to adjust anything - I want this to be perfect for you!`
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="border border-cream-dark dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-navy dark:text-white">Personal Note from Halley</h3>
        <button
          onClick={generateNote}
          disabled={generating}
          className="flex items-center gap-1.5 text-xs font-medium text-cb-pink hover:text-cb-pink/80 disabled:opacity-50 transition-colors"
        >
          {generating ? (
            <>
              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              Generate with AI
            </>
          )}
        </button>
      </div>
      <Textarea
        value={note}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write a personal message to the client... or click 'Generate with AI' for a warm, Halley-style note."
        rows={4}
        className="text-sm resize-none border-cream-dark dark:border-slate-600 focus:ring-cb-pink/40"
      />
    </div>
  );
}
