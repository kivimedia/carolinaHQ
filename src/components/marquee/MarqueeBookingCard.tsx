'use client';

import type { MarqueeBooking, MarqueeSet } from '@/hooks/use-marquee';
import { useUpdateBookingStatus } from '@/hooks/use-marquee';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  reserved: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Reserved' },
  confirmed: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Confirmed' },
  picked_up: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'Picked Up' },
  returned: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500', label: 'Returned' },
  cancelled: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-400', label: 'Cancelled' },
};

const NEXT_STATUS: Record<string, MarqueeBooking['status']> = {
  reserved: 'confirmed',
  confirmed: 'picked_up',
  picked_up: 'returned',
};

const NEXT_LABEL: Record<string, string> = {
  reserved: 'Confirm',
  confirmed: 'Mark Picked Up',
  picked_up: 'Mark Returned',
};

interface Props {
  booking: MarqueeBooking;
  sets: MarqueeSet[];
}

export default function MarqueeBookingCard({ booking, sets }: Props) {
  const updateStatus = useUpdateBookingStatus();
  const style = STATUS_STYLES[booking.status] || STATUS_STYLES.reserved;
  const setName = sets.find((s) => s.id === booking.set_id)?.name || 'Unknown set';
  const nextStatus = NEXT_STATUS[booking.status];
  const nextLabel = NEXT_LABEL[booking.status];

  const eventDate = new Date(booking.event_date + 'T00:00:00');
  const dateStr = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isToday = new Date().toISOString().split('T')[0] === booking.event_date;
  const isPast = new Date(booking.event_date) < new Date(new Date().toISOString().split('T')[0]);

  return (
    <div className={`
      rounded-xl border p-4 transition-all
      ${isToday
        ? 'border-pink-300 dark:border-pink-700 bg-pink-50/50 dark:bg-pink-950/20'
        : 'border-cream-dark dark:border-slate-700 bg-white dark:bg-slate-800/50'
      }
    `}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-navy dark:text-white tracking-wider">
              {booking.text}
            </span>
            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
              {style.label}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-sm text-navy/50 dark:text-slate-400">
            <span className={isToday ? 'text-pink-600 dark:text-pink-400 font-semibold' : isPast ? 'text-red-500' : ''}>
              {isToday ? 'TODAY' : dateStr}
            </span>
            {booking.end_date && booking.end_date !== booking.event_date && (
              <span>
                - {new Date(booking.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700">{setName}</span>
          </div>

          {(booking.client_name || booking.event_name) && (
            <p className="text-sm text-navy/70 dark:text-slate-300 mt-1">
              {[booking.client_name, booking.event_name].filter(Boolean).join(' - ')}
            </p>
          )}

          {booking.notes && (
            <p className="text-xs text-navy/40 dark:text-slate-500 mt-1 italic">{booking.notes}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {nextStatus && (
            <button
              onClick={() => updateStatus.mutate({ id: booking.id, status: nextStatus })}
              disabled={updateStatus.isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-navy/5 dark:bg-white/5 hover:bg-navy/10 dark:hover:bg-white/10 text-navy dark:text-white font-medium transition-colors disabled:opacity-50"
            >
              {nextLabel}
            </button>
          )}
          {booking.status !== 'cancelled' && booking.status !== 'returned' && (
            <button
              onClick={() => updateStatus.mutate({ id: booking.id, status: 'cancelled' })}
              disabled={updateStatus.isPending}
              className="text-xs px-2 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
              title="Cancel booking"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Letter breakdown */}
      <div className="flex flex-wrap gap-1 mt-3">
        {Object.entries(booking.letters_needed)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([char, qty]) => (
            <span
              key={char}
              className="text-xs px-1.5 py-0.5 rounded bg-navy/5 dark:bg-white/10 text-navy/60 dark:text-slate-400 font-mono"
            >
              {char}{qty > 1 ? `x${qty}` : ''}
            </span>
          ))}
      </div>
    </div>
  );
}
