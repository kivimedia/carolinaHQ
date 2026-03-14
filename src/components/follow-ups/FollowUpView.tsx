'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Clock, AlertTriangle, CalendarClock, Mail, ExternalLink } from 'lucide-react';
import { format, isToday, isPast, isFuture, parseISO } from 'date-fns';

interface FollowUp {
  cardId: string;
  cardTitle: string;
  clientEmail: string | null;
  eventType: string | null;
  eventDate: string | null;
  followUpDate: string | null;
  lastTouchedAt: string | null;
  daysOverdue: number;
  listName: string;
  boardId: string;
  reason: 'explicit_date' | 'stale_inquiry' | 'needs_follow_up_list';
}

type FilterTab = 'all' | 'overdue' | 'today' | 'upcoming';

const REASON_LABELS: Record<string, string> = {
  explicit_date: 'Scheduled',
  stale_inquiry: 'Stale inquiry',
  needs_follow_up_list: 'In follow-up list',
};

export default function FollowUpView() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const router = useRouter();

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/follow-ups');
      if (res.ok) {
        const data = await res.json();
        setFollowUps(data.followUps || []);
      }
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const overdue = followUps.filter((f) => f.followUpDate && isPast(parseISO(f.followUpDate)) && !isToday(parseISO(f.followUpDate)));
  const today = followUps.filter((f) => f.followUpDate && isToday(parseISO(f.followUpDate)));
  const upcoming = followUps.filter((f) => f.followUpDate && isFuture(parseISO(f.followUpDate)) && !isToday(parseISO(f.followUpDate)));
  const stale = followUps.filter((f) => !f.followUpDate);

  const getFiltered = (): FollowUp[] => {
    switch (activeTab) {
      case 'overdue': return [...overdue, ...stale];
      case 'today': return today;
      case 'upcoming': return upcoming;
      default: return followUps;
    }
  };

  const filtered = getFiltered();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-electric" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 bg-cream dark:bg-dark-bg">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Overdue" count={overdue.length + stale.length} color="text-red-600 bg-red-50 dark:bg-red-950/30" />
        <StatCard label="Today" count={today.length} color="text-amber-600 bg-amber-50 dark:bg-amber-950/30" />
        <StatCard label="Upcoming" count={upcoming.length} color="text-electric bg-electric/10" />
        <StatCard label="Total" count={followUps.length} color="text-navy/70 bg-white dark:bg-dark-surface dark:text-slate-300" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl bg-white dark:bg-dark-surface p-1 mb-4 w-fit border border-cream-dark dark:border-slate-700">
        {([
          { key: 'all', label: 'All', count: followUps.length },
          { key: 'overdue', label: 'Overdue', count: overdue.length + stale.length },
          { key: 'today', label: 'Today', count: today.length },
          { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
        ] as { key: FilterTab; label: string; count: number }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium font-body transition-colors ${
              activeTab === tab.key
                ? 'bg-electric text-white'
                : 'text-navy/50 dark:text-slate-400 hover:text-navy dark:hover:text-slate-200'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Follow-up list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CalendarClock className="h-12 w-12 text-navy/20 dark:text-slate-600 mb-3" />
          <p className="text-sm text-navy/40 dark:text-slate-500 font-body">
            {activeTab === 'all' ? 'No follow-ups pending.' : `No ${activeTab} follow-ups.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((fu) => (
            <FollowUpRow
              key={fu.cardId}
              followUp={fu}
              onOpenCard={() => router.push(`/board/${fu.boardId}?card=${fu.cardId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-xl p-3 sm:p-4 ${color} border border-cream-dark/50 dark:border-slate-700`}>
      <p className="text-2xl font-bold font-heading">{count}</p>
      <p className="text-xs font-body opacity-70">{label}</p>
    </div>
  );
}

function FollowUpRow({ followUp, onOpenCard }: { followUp: FollowUp; onOpenCard: () => void }) {
  const fu = followUp;
  const isOverdue = fu.followUpDate && isPast(parseISO(fu.followUpDate)) && !isToday(parseISO(fu.followUpDate));
  const isDueToday = fu.followUpDate && isToday(parseISO(fu.followUpDate));

  return (
    <div
      onClick={onOpenCard}
      className={`flex items-center gap-3 sm:gap-4 rounded-xl p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md border ${
        isOverdue
          ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
          : isDueToday
          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
          : 'bg-white dark:bg-dark-surface border-cream-dark dark:border-slate-700'
      }`}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center ${
        isOverdue ? 'bg-red-100 dark:bg-red-900/30' : isDueToday ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-electric/10'
      }`}>
        {isOverdue ? (
          <AlertTriangle className="h-4 w-4 text-red-600" />
        ) : isDueToday ? (
          <Clock className="h-4 w-4 text-amber-600" />
        ) : (
          <CalendarClock className="h-4 w-4 text-electric" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-navy dark:text-slate-100 font-body truncate">
          {fu.cardTitle}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-navy/50 dark:text-slate-400 font-body mt-0.5">
          {fu.eventType && <span>{fu.eventType}</span>}
          {fu.eventDate && <span>{format(parseISO(fu.eventDate), 'MMM d, yyyy')}</span>}
          <span className="px-1.5 py-0.5 rounded bg-cream-dark/50 dark:bg-slate-700 text-[10px]">
            {REASON_LABELS[fu.reason] || fu.reason}
          </span>
        </div>
      </div>

      {/* Follow-up date */}
      <div className="flex-shrink-0 text-right hidden sm:block">
        {fu.followUpDate ? (
          <>
            <p className={`text-xs font-medium font-body ${
              isOverdue ? 'text-red-600' : isDueToday ? 'text-amber-600' : 'text-navy/60 dark:text-slate-400'
            }`}>
              {format(parseISO(fu.followUpDate), 'MMM d')}
            </p>
            {fu.daysOverdue > 0 && (
              <p className="text-[10px] text-red-500">{fu.daysOverdue}d overdue</p>
            )}
          </>
        ) : (
          <p className="text-[10px] text-navy/30 dark:text-slate-500">No date set</p>
        )}
      </div>

      {/* Email icon */}
      {fu.clientEmail && (
        <a
          href={`mailto:${fu.clientEmail}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-cream-dark dark:hover:bg-slate-700 transition-colors hidden sm:flex"
          title={`Email ${fu.clientEmail}`}
        >
          <Mail className="h-4 w-4 text-navy/30 dark:text-slate-500" />
        </a>
      )}

      <ExternalLink className="h-3.5 w-3.5 text-navy/20 dark:text-slate-600 flex-shrink-0" />
    </div>
  );
}
