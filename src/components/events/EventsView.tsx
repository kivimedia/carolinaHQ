'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Calendar, AlertCircle, RefreshCw, ChevronDown,
  Trash2, Eye, MoreHorizontal, ArrowUpDown, Filter,
} from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { useRentalProjects, useDeleteRentalProject, useEventStatusCounts } from '@/hooks/inventory/useRentalProjects';
import { EventStatusBadge } from './EventStatusBadge';
import { AddEventDialog } from './AddEventDialog';
import type { RentalProjectStatus } from '@/lib/inventory/types';

type SortField = 'name' | 'start_date' | 'status' | 'total' | 'client' | 'created_at';
type SortDir = 'asc' | 'desc';

export default function EventsView() {
  const router = useRouter();
  const { data: events, isLoading, error, refetch } = useRentalProjects();
  const { data: statusCounts } = useEventStatusCounts();
  const deleteEvent = useDeleteRentalProject();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    if (!events) return [];
    let result = [...events];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.rental_clients?.name?.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((e) => e.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'client': cmp = (a.rental_clients?.name || '').localeCompare(b.rental_clients?.name || ''); break;
        case 'start_date': cmp = (a.start_date || '').localeCompare(b.start_date || ''); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'total': cmp = (a.total || 0) - (b.total || 0); break;
        case 'created_at': cmp = a.created_at.localeCompare(b.created_at); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [events, search, statusFilter, sortField, sortDir]);

  const statusOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'All Events' },
    { value: 'draft', label: 'Draft' },
    { value: 'quote_sent', label: 'Quote Sent' },
    { value: 'action_needed', label: 'Action Needed' },
    { value: 'signed', label: 'Signed' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 font-medium text-gray-600 hover:text-navy transition-colors"
    >
      {children}
      <ArrowUpDown className={`h-3 w-3 ${sortField === field ? 'text-cb-pink' : 'text-gray-300'}`} />
    </button>
  );

  if (isLoading) {
    return (
      <InventoryPageLayout title="Events">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </InventoryPageLayout>
    );
  }

  if (error) {
    return (
      <InventoryPageLayout title="Events">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load events</h3>
          <p className="mt-2 text-muted-foreground">{(error as Error).message}</p>
          <InventoryButton inventoryVariant="ghost" className="mt-4" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </InventoryButton>
        </div>
      </InventoryPageLayout>
    );
  }

  return (
    <InventoryPageLayout
      title="Events"
      description={`${events?.length || 0} total events`}
      actions={
        <InventoryButton onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Event
        </InventoryButton>
      }
    >
      {/* Status bar */}
      {statusCounts && Object.keys(statusCounts).length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {statusOptions.filter((s) => s.value === 'all' || (statusCounts[s.value] || 0) > 0).map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s.value
                  ? 'bg-cb-pink text-white'
                  : 'bg-white border border-cb-pink-100 text-gray-600 hover:bg-cb-pink-50'
              }`}
            >
              {s.label}
              {s.value !== 'all' && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  statusFilter === s.value ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {statusCounts[s.value] || 0}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events, clients, venues..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cb-pink-100 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30 bg-white"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cb-pink-100 p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-cb-pink/40" />
          <h3 className="mt-4 text-lg font-semibold text-navy">No events found</h3>
          <p className="mt-2 text-muted-foreground">
            {search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first event to get started.'}
          </p>
          {!search && statusFilter === 'all' && (
            <InventoryButton onClick={() => setAddDialogOpen(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-1" /> Create First Event
            </InventoryButton>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-cb-pink-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cb-pink-100 bg-cb-pink-50/30">
                <th className="text-left px-4 py-3"><SortHeader field="name">Event</SortHeader></th>
                <th className="text-left px-4 py-3"><SortHeader field="client">Client</SortHeader></th>
                <th className="text-left px-4 py-3"><SortHeader field="start_date">Date</SortHeader></th>
                <th className="text-left px-4 py-3"><SortHeader field="status">Status</SortHeader></th>
                <th className="text-right px-4 py-3"><SortHeader field="total">Total</SortHeader></th>
                <th className="text-right px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => (
                <tr
                  key={event.id}
                  className="border-b last:border-b-0 border-cb-pink-50 hover:bg-cb-pink-50/20 transition-colors cursor-pointer"
                  onClick={() => router.push(`/events/${event.id}`)}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-navy">{event.name}</p>
                      {event.venue && <p className="text-xs text-muted-foreground">{event.venue}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{event.rental_clients?.name || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {event.start_date ? (
                      <span className="text-sm">
                        {new Date(event.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No date</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <EventStatusBadge status={event.status} />
                  </td>
                  <td className="text-right px-4 py-3 font-medium">
                    {event.total != null ? `$${event.total.toFixed(2)}` : '-'}
                  </td>
                  <td className="text-right px-4 py-3">
                    <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/events/${event.id}`)}
                        className="rounded-lg p-1.5 hover:bg-cb-pink-50 text-gray-400 hover:text-gray-600"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this event?')) {
                            deleteEvent.mutate(event.id);
                          }
                        }}
                        className="rounded-lg p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddEventDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreated={(id) => router.push(`/events/${id}`)}
      />
    </InventoryPageLayout>
  );
}
