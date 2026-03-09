'use client';

import { useState } from 'react';
import Link from 'next/link';
import ProposalQueueView from './ProposalQueueView';
import ProposalLearningView from './ProposalLearningView';

type Tab = 'queue' | 'learning';

export default function ProposalsPageContent() {
  const [tab, setTab] = useState<Tab>('queue');

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Top-level tabs */}
      <div className="border-b border-cream-dark dark:border-slate-700 px-4 sm:px-6 bg-white dark:bg-dark-surface flex items-center justify-between">
        <nav className="flex gap-1 -mb-px" aria-label="Proposal sections">
          <button
            onClick={() => setTab('queue')}
            className={`px-4 py-2.5 text-sm font-semibold font-heading border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === 'queue'
                ? 'border-cb-pink text-cb-pink'
                : 'border-transparent text-navy/50 dark:text-slate-400 hover:text-navy dark:hover:text-slate-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Queue
          </button>
          <button
            onClick={() => setTab('learning')}
            className={`px-4 py-2.5 text-sm font-semibold font-heading border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === 'learning'
                ? 'border-cb-pink text-cb-pink'
                : 'border-transparent text-navy/50 dark:text-slate-400 hover:text-navy dark:hover:text-slate-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            Learning
          </button>
        </nav>
        {tab === 'queue' && (
          <Link
            href="/proposals/builder"
            className="shrink-0 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-cb-pink text-white hover:bg-cb-pink/90 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Proposal
          </Link>
        )}
      </div>

      {/* Tab content */}
      {tab === 'queue' ? <ProposalQueueView /> : <ProposalLearningView />}
    </div>
  );
}
