'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  useMarqueeSets,
  useCreateBooking,
  useUpdateBookingStatus,
  parseLettersNeeded,
  type MarqueeBooking,
} from '@/hooks/use-marquee';

interface Props {
  cardId: string;
  clientName?: string | null;
  eventDate?: string | null;
}

export default function CardMarqueeBookings({ cardId, clientName, eventDate }: Props) {
  const { data: sets } = useMarqueeSets();
  const [showQuickBook, setShowQuickBook] = useState(false);
  const [text, setText] = useState('');
  const [selectedSetId, setSelectedSetId] = useState('');
  const createBooking = useCreateBooking();
  const updateStatus = useUpdateBookingStatus();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['marquee-bookings-card', cardId],
    queryFn: async (): Promise<MarqueeBooking[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('marquee_bookings')
        .select('*')
        .eq('card_id', cardId)
        .order('event_date');
      if (error) throw error;
      return (data || []) as MarqueeBooking[];
    },
  });

  const activeBookings = useMemo(
    () => (bookings || []).filter((b) => b.status !== 'cancelled' && b.status !== 'returned'),
    [bookings]
  );

  const handleQuickBook = async () => {
    const setId = selectedSetId || sets?.[0]?.id;
    if (!setId || !text.trim() || !eventDate) return;
    await createBooking.mutateAsync({
      set_id: setId,
      text: text.trim().toUpperCase(),
      event_date: eventDate,
      card_id: cardId,
      client_name: clientName || undefined,
    });
    setText('');
    setShowQuickBook(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-navy/50 dark:text-slate-400 uppercase tracking-wider">
          Marquee Letters
        </h3>
        <Link
          href="/marquee"
          className="text-[10px] text-pink-500 hover:text-pink-600 font-medium"
        >
          Full page
        </Link>
      </div>

      {/* Existing bookings */}
      {activeBookings.length > 0 && (
        <div className="space-y-1.5">
          {activeBookings.map((b) => {
            const setName = sets?.find((s) => s.id === b.set_id)?.name || '';
            return (
              <div
                key={b.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-cream dark:bg-slate-700/50 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-navy dark:text-white tracking-wider">{b.text}</span>
                  <span className="text-[10px] text-navy/40 dark:text-slate-500">{setName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    {b.status}
                  </span>
                </div>
                {b.status === 'reserved' && (
                  <button
                    onClick={() => updateStatus.mutate({ id: b.id, status: 'confirmed' })}
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Confirm
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick book inline */}
      {showQuickBook ? (
        <div className="space-y-2 p-3 rounded-lg border border-cream-dark dark:border-slate-600 bg-cream/50 dark:bg-slate-700/30">
          {sets && sets.length > 1 && (
            <select
              value={selectedSetId || sets[0]?.id || ''}
              onChange={(e) => setSelectedSetId(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border border-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-navy dark:text-white"
            >
              {sets.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.toUpperCase())}
            placeholder="Text to spell (e.g. SMITH)"
            className="w-full text-sm px-3 py-2 rounded-lg border border-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 text-navy dark:text-white font-bold tracking-widest placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-1 focus:ring-pink-500"
            autoFocus
          />
          {!eventDate && (
            <p className="text-[10px] text-amber-600">No event date set on this card - set one first</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleQuickBook}
              disabled={!text.trim() || !eventDate || createBooking.isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-pink-500 text-white font-medium hover:bg-pink-600 disabled:opacity-40"
            >
              {createBooking.isPending ? 'Reserving...' : 'Reserve'}
            </button>
            <button
              onClick={() => { setShowQuickBook(false); setText(''); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-slate-600 text-navy dark:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowQuickBook(true)}
          className="text-xs text-pink-500 hover:text-pink-600 font-medium flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Book marquee letters
        </button>
      )}
    </div>
  );
}
