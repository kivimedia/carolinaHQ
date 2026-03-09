'use client';

import QuickBook from './QuickBook';
import BookingsList from './BookingsList';
import LetterInventory from './LetterInventory';

export default function MarqueePageContent() {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-cream/30 dark:bg-navy">
      <QuickBook />
      <BookingsList />
      <LetterInventory />
    </div>
  );
}
