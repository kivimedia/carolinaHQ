'use client';

import { useState } from 'react';
import {
  useMarqueeSets,
  useMarqueeLetters,
  useUpdateLetterQuantity,
  useCreateSet,
} from '@/hooks/use-marquee';

function LetterGrid({ setId }: { setId: string }) {
  const { data: letters, isLoading } = useMarqueeLetters(setId);
  const updateQuantity = useUpdateLetterQuantity();
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState<Record<string, number>>({});

  if (isLoading) {
    return <div className="animate-pulse h-24 bg-gray-100 dark:bg-slate-700/50 rounded-xl" />;
  }

  const alphaLetters = (letters || []).filter((l) => /^[A-Z]$/.test(l.character));
  const numberLetters = (letters || []).filter((l) => /^[0-9]$/.test(l.character));
  const symbolLetters = (letters || []).filter((l) => /^[^A-Z0-9]$/.test(l.character));

  const handleSave = async () => {
    const promises = Object.entries(edits).map(([letterId, quantity]) =>
      updateQuantity.mutateAsync({ letterId, quantity })
    );
    await Promise.all(promises);
    setEditing(false);
    setEdits({});
  };

  const renderLetterCell = (letter: typeof alphaLetters[0]) => {
    const qty = edits[letter.id] ?? letter.quantity;
    return (
      <div
        key={letter.id}
        className={`
          flex flex-col items-center justify-center rounded-lg p-1.5 min-w-[44px] transition-colors
          ${qty === 0
            ? 'bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600'
            : 'bg-cream dark:bg-slate-700 text-navy dark:text-white'
          }
        `}
      >
        <span className="text-sm font-bold font-mono">{letter.character}</span>
        {editing ? (
          <input
            type="number"
            min="0"
            max="20"
            value={qty}
            onChange={(e) => {
              const val = Math.max(0, parseInt(e.target.value) || 0);
              setEdits((prev) => ({ ...prev, [letter.id]: val }));
            }}
            className="w-10 text-center text-xs py-0.5 rounded border border-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
        ) : (
          <span className={`text-xs ${qty === 0 ? 'text-gray-300 dark:text-slate-600' : 'text-navy/50 dark:text-slate-400'}`}>
            {qty}
          </span>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* A-Z */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {alphaLetters.map(renderLetterCell)}
      </div>
      {/* 0-9 */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {numberLetters.map(renderLetterCell)}
      </div>
      {/* Symbols */}
      {symbolLetters.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {symbolLetters.map(renderLetterCell)}
        </div>
      )}

      {/* Edit / Save buttons */}
      <div className="flex gap-2 mt-2">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              disabled={updateQuantity.isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {updateQuantity.isPending ? 'Saving...' : 'Save Quantities'}
            </button>
            <button
              onClick={() => { setEditing(false); setEdits({}); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-slate-600 text-navy dark:text-white font-medium hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-navy/5 dark:bg-white/5 text-navy/60 dark:text-slate-400 font-medium hover:bg-navy/10 dark:hover:bg-white/10 transition-colors"
          >
            Edit Quantities
          </button>
        )}
      </div>
    </div>
  );
}

export default function LetterInventory() {
  const { data: sets, isLoading } = useMarqueeSets();
  const createSet = useCreateSet();
  const [showNewSet, setShowNewSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDesc, setNewSetDesc] = useState('');

  const handleCreateSet = async () => {
    if (!newSetName.trim()) return;
    await createSet.mutateAsync({ name: newSetName.trim(), description: newSetDesc || undefined });
    setNewSetName('');
    setNewSetDesc('');
    setShowNewSet(false);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-cream-dark dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="h-24 bg-gray-100 dark:bg-slate-700/50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cream-dark dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6">
      <h2 className="text-lg font-heading font-semibold text-navy dark:text-white mb-4">
        My Inventory
      </h2>

      <div className="space-y-6">
        {(sets || []).map((set) => (
          <div key={set.id}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-navy/70 dark:text-slate-300">
                {set.name}
              </span>
              {set.description && (
                <span className="text-xs text-navy/30 dark:text-slate-500">
                  {set.description}
                </span>
              )}
            </div>
            <LetterGrid setId={set.id} />
          </div>
        ))}
      </div>

      {/* Add new set */}
      <div className="mt-6 pt-4 border-t border-cream-dark dark:border-slate-700">
        {showNewSet ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              placeholder="Set name (e.g. Gold Marquee 5ft)"
              className="w-full px-3 py-2 rounded-lg border border-cream-dark dark:border-slate-600 bg-cream/50 dark:bg-slate-700/50 text-navy dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            />
            <input
              type="text"
              value={newSetDesc}
              onChange={(e) => setNewSetDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 rounded-lg border border-cream-dark dark:border-slate-600 bg-cream/50 dark:bg-slate-700/50 text-navy dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateSet}
                disabled={!newSetName.trim() || createSet.isPending}
                className="text-xs px-3 py-1.5 rounded-lg bg-pink-500 text-white font-medium hover:bg-pink-600 transition-colors disabled:opacity-50"
              >
                {createSet.isPending ? 'Creating...' : 'Create Set'}
              </button>
              <button
                onClick={() => { setShowNewSet(false); setNewSetName(''); setNewSetDesc(''); }}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-slate-600 text-navy dark:text-white font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewSet(true)}
            className="text-sm text-pink-500 hover:text-pink-600 font-medium transition-colors flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add New Set
          </button>
        )}
      </div>
    </div>
  );
}
