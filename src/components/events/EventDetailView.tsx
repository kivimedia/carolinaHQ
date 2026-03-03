'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Pencil, Calendar, MapPin, User, Phone, Mail,
  AlertCircle, RefreshCw, Package, CreditCard, CheckSquare, FileText,
  Clock, Truck, Users,
} from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { useRentalProject, useUpdateRentalProject } from '@/hooks/inventory/useRentalProjects';
import { EventStatusBadge, EventStatusSelect } from './EventStatusBadge';
import { EditEventDialog } from './EditEventDialog';
import { EventItemsTab } from './EventItemsTab';
import { EventBillingTab } from './EventBillingTab';
import { EventFulfillmentTab } from './EventFulfillmentTab';
import { EventFilesTab } from './EventFilesTab';
import type { RentalProjectStatus, RentalProject } from '@/lib/inventory/types';

type TabType = 'items' | 'billing' | 'fulfillment' | 'files';

export default function EventDetailView({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { data: eventData, isLoading, error, refetch } = useRentalProject(eventId);
  const updateProject = useUpdateRentalProject();

  const [activeTab, setActiveTab] = useState<TabType>('items');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const event = eventData as RentalProject & {
    rental_clients?: any;
    rental_project_items?: any[];
    rental_payments?: any[];
  } | null;

  const handleStatusChange = async (status: RentalProjectStatus) => {
    await updateProject.mutateAsync({ id: eventId, status });
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-60 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold">Event not found</h3>
          <p className="mt-2 text-muted-foreground">The event doesn't exist or you don't have access.</p>
          <div className="mt-4 flex justify-center gap-2">
            <InventoryButton inventoryVariant="ghost" onClick={() => router.push('/events')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </InventoryButton>
            <InventoryButton inventoryVariant="ghost" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </InventoryButton>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'items', label: 'Items', icon: <Package className="h-4 w-4" /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'fulfillment', label: 'Fulfillment', icon: <CheckSquare className="h-4 w-4" /> },
    { id: 'files', label: 'Files', icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <InventoryButton inventoryVariant="ghost" className="h-10 w-10 p-0" onClick={() => router.push('/events')}>
            <ArrowLeft className="h-5 w-5" />
          </InventoryButton>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-navy">{event.name}</h1>
              <EventStatusSelect value={event.status} onChange={handleStatusChange} />
            </div>
            {event.event_type && (
              <p className="text-sm text-muted-foreground mt-0.5">{event.event_type}</p>
            )}
          </div>
        </div>
        <InventoryButton inventoryVariant="ghost" onClick={() => setEditDialogOpen(true)}>
          <Pencil className="h-4 w-4" />
        </InventoryButton>
      </div>

      {/* Event info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Client card */}
        {event.rental_clients && (
          <div className="bg-white rounded-2xl border border-cb-pink-100 p-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> Client
            </h3>
            <p className="font-semibold text-navy">{event.rental_clients.name}</p>
            {event.rental_clients.email && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Mail className="h-3 w-3" /> {event.rental_clients.email}
              </p>
            )}
            {event.rental_clients.phone && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> {event.rental_clients.phone}
              </p>
            )}
          </div>
        )}

        {/* Date card */}
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Event Date
          </h3>
          {event.start_date ? (
            <>
              <p className="font-semibold text-navy">
                {new Date(event.start_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              {event.end_date && event.end_date !== event.start_date && (
                <p className="text-sm text-muted-foreground">
                  to {new Date(event.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No date set</p>
          )}
          {event.attendee_count && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Users className="h-3 w-3" /> {event.attendee_count} guests
            </p>
          )}
        </div>

        {/* Venue card */}
        {(event.venue || event.venue_address) && (
          <div className="bg-white rounded-2xl border border-cb-pink-100 p-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Venue
            </h3>
            {event.venue && <p className="font-semibold text-navy">{event.venue}</p>}
            {event.venue_address && <p className="text-sm text-muted-foreground">{event.venue_address}</p>}
          </div>
        )}

        {/* Delivery card */}
        {(event.delivery_address || event.delivery_time || event.pickup_time) && (
          <div className="bg-white rounded-2xl border border-cb-pink-100 p-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" /> Delivery
            </h3>
            {event.delivery_address && <p className="text-sm">{event.delivery_address}</p>}
            <div className="flex gap-4 mt-1">
              {event.delivery_time && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Delivery: {event.delivery_time}
                </p>
              )}
              {event.pickup_time && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Pickup: {event.pickup_time}
                </p>
              )}
            </div>
            {event.delivery_contact_name && (
              <p className="text-sm text-muted-foreground mt-1">
                Contact: {event.delivery_contact_name} {event.delivery_contact_phone && `(${event.delivery_contact_phone})`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      {(event.notes || event.internal_notes) && (
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-4">
          {event.notes && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-1">Notes</h3>
              <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
            </div>
          )}
          {event.internal_notes && (
            <div className={event.notes ? 'mt-3 pt-3 border-t border-cb-pink-100' : ''}>
              <h3 className="text-xs font-medium text-muted-foreground mb-1">Internal Notes</h3>
              <p className="text-sm whitespace-pre-wrap">{event.internal_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-cb-pink-100">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors ${
                activeTab === tab.id
                  ? 'bg-white border border-b-0 border-cb-pink-100 text-cb-pink'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-cb-pink-50/30'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {activeTab === 'items' && <EventItemsTab projectId={eventId} />}
        {activeTab === 'billing' && <EventBillingTab projectId={eventId} total={event.total || 0} />}
        {activeTab === 'fulfillment' && <EventFulfillmentTab projectId={eventId} />}
        {activeTab === 'files' && <EventFilesTab projectId={eventId} />}
      </div>

      {/* Dialogs */}
      <EditEventDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} event={event} />
    </div>
  );
}
