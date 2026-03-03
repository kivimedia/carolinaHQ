'use client';

import { useState, useMemo } from 'react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { InventoryBadge } from '@/components/inventory-ui/InventoryBadge';
import { useItemSetAsides } from '@/hooks/inventory/useSetAsides';
import { format, parseISO, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvailabilityCalendarProps {
  itemId: string;
  totalQuantity: number;
  bufferQuantity: number;
}

interface DateInfo {
  reserved: number;
  setAside: number;
  available: number;
  projects: { name: string; quantity: number; status: string }[];
  setAsides: { reason: string; quantity: number }[];
}

export function AvailabilityCalendar({ itemId, totalQuantity, bufferQuantity }: AvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: setAsides } = useItemSetAsides(itemId);

  const dateInfoMap = useMemo(() => {
    const map = new Map<string, DateInfo>();

    const getDateInfo = (dateStr: string): DateInfo => {
      if (!map.has(dateStr)) {
        map.set(dateStr, {
          reserved: 0,
          setAside: 0,
          available: totalQuantity - bufferQuantity,
          projects: [],
          setAsides: [],
        });
      }
      return map.get(dateStr)!;
    };

    setAsides?.forEach((sa) => {
      if (!sa.start_date || !sa.end_date) return;
      const startDate = parseISO(sa.start_date);
      const endDate = parseISO(sa.end_date);
      let current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = format(current, 'yyyy-MM-dd');
        const info = getDateInfo(dateStr);
        info.setAside += sa.quantity;
        info.available = Math.max(0, totalQuantity - bufferQuantity - info.reserved - info.setAside);
        info.setAsides.push({ reason: sa.reason || 'Set aside', quantity: sa.quantity });
        current = new Date(current.setDate(current.getDate() + 1));
      }
    });

    return map;
  }, [setAsides, totalQuantity, bufferQuantity]);

  const selectedDateInfo = selectedDate
    ? dateInfoMap.get(format(selectedDate, 'yyyy-MM-dd')) || {
        reserved: 0, setAside: 0, available: totalQuantity - bufferQuantity, projects: [], setAsides: [],
      }
    : null;

  // Generate calendar days
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const getDateStatus = (day: number) => {
    const dateStr = format(new Date(year, month, day), 'yyyy-MM-dd');
    const info = dateInfoMap.get(dateStr);
    if (!info) return 'available';
    if (info.available === 0) return 'unavailable';
    if (info.reserved > 0 || info.setAside > 0) return 'partial';
    return 'available';
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-cb-pink-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-navy">Availability Calendar</h3>
          <div className="flex items-center gap-1">
            <InventoryButton inventoryVariant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </InventoryButton>
            <span className="text-sm font-medium w-32 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
            <InventoryButton inventoryVariant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </InventoryButton>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const status = getDateStatus(day);
            const date = new Date(year, month, day);
            const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
            return (
              <button
                key={day}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  'h-8 w-full rounded-lg text-sm transition-colors',
                  isSelected && 'ring-2 ring-cb-pink font-bold',
                  status === 'unavailable' && 'bg-red-100 text-red-600',
                  status === 'partial' && 'bg-amber-100 text-amber-700',
                  status === 'available' && 'hover:bg-cb-pink-50',
                )}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-300" /><span className="text-muted-foreground">Available</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-300" /><span className="text-muted-foreground">Partial</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-300" /><span className="text-muted-foreground">Unavailable</span></div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl border border-cb-pink-100 p-4">
        <h3 className="text-base font-semibold text-navy mb-1">
          {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">Availability details for selected date</p>

        {selectedDateInfo ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-xl bg-cb-pink-50">
                <div className="text-2xl font-bold text-navy">{totalQuantity}</div>
                <div className="text-xs text-muted-foreground">Total Stock</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-amber-50">
                <div className="text-2xl font-bold text-amber-600">{selectedDateInfo.reserved + selectedDateInfo.setAside}</div>
                <div className="text-xs text-muted-foreground">Reserved</div>
              </div>
              <div className={cn('text-center p-3 rounded-xl', selectedDateInfo.available > 0 ? 'bg-green-50' : 'bg-red-50')}>
                <div className={cn('text-2xl font-bold', selectedDateInfo.available > 0 ? 'text-green-600' : 'text-red-500')}>
                  {selectedDateInfo.available}
                </div>
                <div className="text-xs text-muted-foreground">Available</div>
              </div>
            </div>

            {bufferQuantity > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" /> Buffer of {bufferQuantity} units held back
              </div>
            )}

            {selectedDateInfo.setAsides.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-navy">Set Asides ({selectedDateInfo.setAsides.length})</h4>
                {selectedDateInfo.setAsides.map((sa, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-cb-pink-50/50">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">{sa.reason}</span>
                    </div>
                    <InventoryBadge variant="warning">{sa.quantity} units</InventoryBadge>
                  </div>
                ))}
              </div>
            )}

            {selectedDateInfo.projects.length === 0 && selectedDateInfo.setAsides.length === 0 && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">All {totalQuantity - bufferQuantity} units available</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Click on a date to see details</div>
        )}
      </div>
    </div>
  );
}
