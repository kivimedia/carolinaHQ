'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface LinkedProposal {
  id: string;
  proposal_number: string | null;
  client_name: string | null;
  event_type: string | null;
  total: number | null;
  status: string | null;
  created_at: string;
}

interface CardProposalsProps {
  cardId: string;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  eventType?: string | null;
  eventDate?: string | null;
  venueName?: string | null;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-600 dark:text-slate-300', label: 'Draft' },
  sent: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Sent' },
  viewed: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: 'Viewed' },
  accepted: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Accepted' },
  rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Rejected' },
  expired: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', label: 'Expired' },
};

export default function CardProposals({
  cardId,
  clientName,
  clientEmail,
  clientPhone,
  eventType,
  eventDate,
  venueName,
}: CardProposalsProps) {
  const supabase = createClient();
  const [proposals, setProposals] = useState<LinkedProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProposals() {
      const { data } = await supabase
        .from('proposals')
        .select('id, proposal_number, client_name, event_type, total, status, created_at')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false })
        .limit(10);

      setProposals((data as LinkedProposal[]) || []);
      setLoading(false);
    }
    fetchProposals();
  }, [cardId]);

  // Build query string for "Create Proposal" link
  const params = new URLSearchParams();
  params.set('cardId', cardId);
  if (clientName) params.set('clientName', clientName);
  if (clientEmail) params.set('clientEmail', clientEmail);
  if (clientPhone) params.set('clientPhone', clientPhone);
  if (eventType) params.set('eventType', eventType);
  if (eventDate) params.set('eventDate', eventDate);
  if (venueName) params.set('venue', venueName);
  const createUrl = `/proposals/new?${params.toString()}`;

  if (loading) {
    return (
      <div className="rounded-lg border border-cream-dark dark:border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-navy dark:text-white mb-2">Proposals</h3>
        <p className="text-xs text-navy/40 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-cream-dark dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-navy dark:text-white">
          Proposals {proposals.length > 0 && <span className="text-navy/40 dark:text-slate-400">({proposals.length})</span>}
        </h3>
        <Link
          href={createUrl}
          className="text-xs font-medium text-electric hover:underline"
        >
          + Create
        </Link>
      </div>

      {proposals.length === 0 ? (
        <p className="text-xs text-navy/40 dark:text-slate-400">No proposals linked to this card yet.</p>
      ) : (
        <div className="space-y-2">
          {proposals.map((p) => {
            const badge = STATUS_BADGES[p.status || 'draft'] || STATUS_BADGES.draft;
            return (
              <Link
                key={p.id}
                href={`/proposals/${p.id}/edit`}
                className="flex items-center justify-between rounded-md p-2 hover:bg-cream-dark dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-navy dark:text-white truncate">
                    {p.proposal_number || 'Draft'}
                    {p.event_type && <span className="text-navy/40 dark:text-slate-400 ml-1">- {p.event_type}</span>}
                  </p>
                  {p.total != null && (
                    <p className="text-xs text-navy/50 dark:text-slate-400 font-mono">${p.total.toLocaleString()}</p>
                  )}
                </div>
                <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
