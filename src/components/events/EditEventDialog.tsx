'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { useUpdateRentalProject } from '@/hooks/inventory/useRentalProjects';
import { useClientsWithFullStats } from '@/hooks/inventory/useClients';
import type { RentalProject } from '@/lib/inventory/types';

interface EditEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: RentalProject | null;
}

export function EditEventDialog({ open, onOpenChange, event }: EditEventDialogProps) {
  const updateProject = useUpdateRentalProject();
  const { data: clients } = useClientsWithFullStats();

  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [eventType, setEventType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [venue, setVenue] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [attendeeCount, setAttendeeCount] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [deliveryContactName, setDeliveryContactName] = useState('');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && event) {
      setName(event.name || '');
      setClientId(event.client_id || '');
      setEventType(event.event_type || '');
      setStartDate(event.start_date || '');
      setEndDate(event.end_date || '');
      setVenue(event.venue || '');
      setVenueAddress(event.venue_address || '');
      setAttendeeCount(event.attendee_count?.toString() || '');
      setDeliveryAddress(event.delivery_address || '');
      setDeliveryTime(event.delivery_time || '');
      setPickupTime(event.pickup_time || '');
      setDeliveryContactName(event.delivery_contact_name || '');
      setDeliveryContactPhone(event.delivery_contact_phone || '');
      setNotes(event.notes || '');
    }
  }, [open, event]);

  if (!open || !event) return null;

  const eventTypes = ['Wedding', 'Birthday', 'Corporate', 'Baby Shower', 'Graduation', 'Anniversary', 'Holiday', 'Other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await updateProject.mutateAsync({
      id: event.id,
      name: name.trim(),
      client_id: clientId || null,
      event_type: eventType || null,
      start_date: startDate || null,
      end_date: endDate || null,
      venue: venue || null,
      venue_address: venueAddress || null,
      attendee_count: attendeeCount ? parseInt(attendeeCount) : null,
      delivery_address: deliveryAddress || null,
      delivery_time: deliveryTime || null,
      pickup_time: pickupTime || null,
      delivery_contact_name: deliveryContactName || null,
      delivery_contact_phone: deliveryContactPhone || null,
      notes: notes || null,
    });
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-navy">Edit Event</h2>
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
              <option value="">No client</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
              <input
                type="number"
                value={attendeeCount}
                onChange={(e) => setAttendeeCount(e.target.value)}
                className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue Address</label>
            <input
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
            />
          </div>

          <div className="border-t border-cb-pink-100 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-navy mb-3">Delivery Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                <input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Time</label>
                  <input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Time</label>
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input
                    value={deliveryContactName}
                    onChange={(e) => setDeliveryContactName(e.target.value)}
                    className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input
                    value={deliveryContactPhone}
                    onChange={(e) => setDeliveryContactPhone(e.target.value)}
                    className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
                  />
                </div>
              </div>
            </div>
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
            <InventoryButton type="submit" disabled={!name.trim() || updateProject.isPending}>
              {updateProject.isPending ? 'Saving...' : 'Save Changes'}
            </InventoryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
