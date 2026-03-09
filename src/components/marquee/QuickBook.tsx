'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  useMarqueeSets,
  useMarqueeAvailability,
  useCreateBooking,
  parseLettersNeeded,
} from '@/hooks/use-marquee';
import LetterAvailability from './LetterAvailability';

export default function QuickBook() {
  const { data: sets } = useMarqueeSets();
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [text, setText] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [eventName, setEventName] = useState('');
  const [notes, setNotes] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const createBooking = useCreateBooking();

  // Auto-select first set
  const activeSetId = selectedSetId || sets?.[0]?.id || '';

  const lettersNeeded = useMemo(() => parseLettersNeeded(text), [text]);
  const hasLetters = Object.keys(lettersNeeded).length > 0;

  const { data: availability, isLoading: availLoading } = useMarqueeAvailability(
    eventDate || undefined,
    activeSetId || undefined,
  );

  const allAvailable = useMemo(() => {
    if (!availability || !hasLetters || !eventDate) return false;
    const availMap = new Map(availability.map((a) => [a.character, a.available]));
    return Object.entries(lettersNeeded).every(
      ([char, needed]) => (availMap.get(char) || 0) >= needed
    );
  }, [availability, lettersNeeded, hasLetters, eventDate]);

  const handleSubmit = useCallback(async () => {
    if (!activeSetId || !text.trim() || !eventDate) return;
    await createBooking.mutateAsync({
      set_id: activeSetId,
      text: text.trim().toUpperCase(),
      event_date: eventDate,
      end_date: endDate || undefined,
      client_name: clientName || undefined,
      event_name: eventName || undefined,
      notes: notes || undefined,
    });
    // Reset form
    setText('');
    setEventDate('');
    setEndDate('');
    setClientName('');
    setEventName('');
    setNotes('');
    setShowDetails(false);
  }, [activeSetId, text, eventDate, endDate, clientName, eventName, notes, createBooking]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="rounded-2xl border border-cream-dark dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6">
      <h2 className="text-lg font-heading font-semibold text-navy dark:text-white mb-4">
        Quick Book
      </h2>

      {/* Set selector tabs */}
      {sets && sets.length > 1 && (
        <div className="flex gap-2 mb-4">
          {sets.map((set) => (
            <button
              key={set.id}
              onClick={() => setSelectedSetId(set.id)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeSetId === set.id
                  ? 'bg-pink-500 text-white shadow-sm'
                  : 'bg-cream dark:bg-slate-700 text-navy/60 dark:text-slate-400 hover:bg-cream-dark dark:hover:bg-slate-600'
                }
              `}
            >
              {set.name}
            </button>
          ))}
        </div>
      )}

      {/* Main form */}
      <div className="space-y-4">
        {/* Text input */}
        <div>
          <label className="block text-sm font-medium text-navy/70 dark:text-slate-300 mb-1">
            Text to spell
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.toUpperCase())}
            placeholder="e.g. SMITH, HAPPY 50TH, GO DEACS"
            className="w-full px-4 py-3 rounded-xl border border-cream-dark dark:border-slate-600 bg-cream/50 dark:bg-slate-700/50 text-navy dark:text-white text-lg font-bold tracking-widest placeholder:text-navy/20 dark:placeholder:text-slate-500 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500"
          />
        </div>

        {/* Date input */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-navy/70 dark:text-slate-300 mb-1">
              Event date
            </label>
            <input
              type="date"
              value={eventDate}
              min={today}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-cream-dark dark:border-slate-600 bg-cream/50 dark:bg-slate-700/50 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-navy/70 dark:text-slate-300 mb-1">
              End date <span className="text-navy/30 dark:text-slate-500">(multi-day)</span>
            </label>
            <input
              type="date"
              value={endDate}
              min={eventDate || today}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-cream-dark dark:border-slate-600 bg-cream/50 dark:bg-slate-700/50 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500"
            />
          </div>
        </div>

        {/* Availability display */}
        {hasLetters && eventDate && (
          <LetterAvailability
            lettersNeeded={lettersNeeded}
            availability={availability || []}
            loading={availLoading}
          />
        )}

        {/* Optional details toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-navy/40 dark:text-slate-500 hover:text-navy/60 dark:hover:text-slate-300 transition-colors"
        >
          {showDetails ? 'Hide details' : 'Add client/event details'}
        </button>

        {showDetails && (
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client name"
              className="px-3 py-2 rounded-lg border border-cream-dark dark:border-slate-600 bg-cream/50 dark:bg-slate-700/50 text-navy dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            />
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Event name"
              className="px-3 py-2 rounded-lg border border-cream-dark dark:border-slate-600 bg-cream/50 dark:bg-slate-700/50 text-navy dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              className="col-span-2 px-3 py-2 rounded-lg border border-cream-dark dark:border-slate-600 bg-cream/50 dark:bg-slate-700/50 text-navy dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            />
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!hasLetters || !eventDate || !allAvailable || createBooking.isPending}
          className="w-full py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {createBooking.isPending
            ? 'Reserving...'
            : !hasLetters
              ? 'Type letters to spell'
              : !eventDate
                ? 'Pick a date'
                : !allAvailable
                  ? 'Some letters unavailable'
                  : 'Reserve Letters'
          }
        </button>
      </div>
    </div>
  );
}
