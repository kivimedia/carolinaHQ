'use client';

import { useState } from 'react';
import { useMarqueeBookings, useMarqueeSets } from '@/hooks/use-marquee';
import MarqueeBookingCard from './MarqueeBookingCard';

export default function BookingsList() {
  const { data: sets } = useMarqueeSets();
  const { data: bookings, isLoading } = useMarqueeBookings();
  const [showPast, setShowPast] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const upcoming = (bookings || []).filter((b) => b.event_date >= today);
  const past = (bookings || []).filter((b) => b.event_date < today);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-cream-dark dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-40 bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="h-20 bg-gray-100 dark:bg-slate-700/50 rounded-xl" />
          <div className="h-20 bg-gray-100 dark:bg-slate-700/50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cream-dark dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-heading font-semibold text-navy dark:text-white">
          Upcoming Bookings
          {upcoming.length > 0 && (
            <span className="ml-2 text-sm font-normal text-navy/40 dark:text-slate-500">
              ({upcoming.length})
            </span>
          )}
        </h2>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-sm text-navy/40 dark:text-slate-500 py-8 text-center">
          No upcoming bookings. Use Quick Book above to reserve letters.
        </p>
      ) : (
        <div className="space-y-3">
          {upcoming.map((booking) => (
            <MarqueeBookingCard key={booking.id} booking={booking} sets={sets || []} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-4 pt-4 border-t border-cream-dark dark:border-slate-700">
          <button
            onClick={() => setShowPast(!showPast)}
            className="text-xs text-navy/40 dark:text-slate-500 hover:text-navy/60 dark:hover:text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points={showPast ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
            </svg>
            Past bookings ({past.length})
          </button>
          {showPast && (
            <div className="space-y-3 mt-3 opacity-60">
              {past.map((booking) => (
                <MarqueeBookingCard key={booking.id} booking={booking} sets={sets || []} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
