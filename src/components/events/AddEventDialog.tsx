'use client';

import { useState, useEffect } from 'react';
import { X, CalendarDays, MapPin, Users } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { useCreateRentalProject } from '@/hooks/inventory/useRentalProjects';
import { useClientsWithFullStats } from '@/hooks/inventory/useClients';
import type { RentalProjectStatus } from '@/lib/inventory/types';

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}

export function AddEventDialog({ open, onOpenChange, onCreated }: AddEventDialogProps) {
  const createProject = useCreateRentalProject();
  const { data: clients } = useClientsWithFullStats();

  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [eventType, setEventType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [venue, setVenue] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [attendeeCount, setAttendeeCount] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setClientId('');
      setEventType('');
      setStartDate('');
      setEndDate('');
      setVenue('');
      setVenueAddress('');
      setAttendeeCount('');
      setNotes('');
    }
  }, [open]);

  if (!open) return null;

  const eventTypes = ['Wedding', 'Birthday', 'Corporate', 'Baby Shower', 'Graduation', 'Anniversary', 'Holiday', 'Other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const result = await createProject.mutateAsync({
      name: name.trim(),
      client_id: clientId || null,
      status: 'draft' as RentalProjectStatus,
      event_type: eventType || null,
      start_date: startDate || null,
      end_date: endDate || startDate || null,
      venue: venue || null,
      venue_address: venueAddress || null,
      attendee_count: attendeeCount ? parseInt(attendeeCount) : null,
      notes: notes || null,
    });
    onOpenChange(false);
    if (onCreated && result?.id) {
      onCreated(result.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-navy">New Event</h2>
          <button onClick={() => onOpenChange(false)} className="rounded-lg p-1.5 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Smith Wedding"
              className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
            >
              <option value="">Select client...</option>
              {(clients || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
            >
              <option value="">Select type...</option>
              {eventTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarDays className="inline h-3.5 w-3.5 mr-1" />Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="inline h-3.5 w-3.5 mr-1" />Venue
              </label>
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Venue name"
                className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Users className="inline h-3.5 w-3.5 mr-1" />Guests
              </label>
              <input
                type="number"
                value={attendeeCount}
                onChange={(e) => setAttendeeCount(e.target.value)}
                placeholder="# of guests"
                className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue Address</label>
            <input
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              placeholder="Full address"
              className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <InventoryButton inventoryVariant="ghost" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </InventoryButton>
            <InventoryButton type="submit" disabled={!name.trim() || createProject.isPending}>
              {createProject.isPending ? 'Creating...' : 'Create Event'}
            </InventoryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
