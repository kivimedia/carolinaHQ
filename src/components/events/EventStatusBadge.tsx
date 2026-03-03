'use client';

import type { RentalProjectStatus } from '@/lib/inventory/types';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700' },
  quote_sent: { label: 'Quote Sent', bg: 'bg-purple-100', text: 'text-purple-700' },
  action_needed: { label: 'Action Needed', bg: 'bg-orange-100', text: 'text-orange-700' },
  signed: { label: 'Signed', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  billing: { label: 'Billing', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  confirmed: { label: 'Confirmed', bg: 'bg-blue-100', text: 'text-blue-700' },
  in_progress: { label: 'In Progress', bg: 'bg-cb-pink/10', text: 'text-cb-pink' },
  completed: { label: 'Completed', bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-700' },
  lost: { label: 'Lost', bg: 'bg-gray-200', text: 'text-gray-600' },
  archived: { label: 'Archived', bg: 'bg-gray-100', text: 'text-gray-500' },
};

export function EventStatusBadge({ status }: { status: RentalProjectStatus | string }) {
  const config = STATUS_CONFIG[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-700' };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export function EventStatusSelect({
  value,
  onChange,
}: {
  value: RentalProjectStatus;
  onChange: (status: RentalProjectStatus) => void;
}) {
  const statuses: RentalProjectStatus[] = [
    'draft', 'quote_sent', 'action_needed', 'signed', 'billing',
    'confirmed', 'in_progress', 'completed', 'cancelled', 'lost',
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as RentalProjectStatus)}
      className="rounded-lg border border-cb-pink-100 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
    >
      {statuses.map((s) => (
        <option key={s} value={s}>
          {STATUS_CONFIG[s]?.label || s}
        </option>
      ))}
    </select>
  );
}
