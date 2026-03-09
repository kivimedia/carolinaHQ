'use client';

import { useState } from 'react';
import { UserRole } from '@/lib/types';
import BoardPermissions from './BoardPermissions';

interface Board {
  id: string;
  name: string;
  board_type: string;
}

const BOARD_TYPE_ICONS: Record<string, string> = {
  boutique_decor: '🎈',
  marquee_letters: '💡',
  private_clients: '🎉',
  owner_dashboard: '👑',
  va_workspace: '📋',
  general_tasks: '✅',
};

export default function BoardPermissionsPicker({
  boards,
  userRole,
}: {
  boards: Board[];
  userRole: UserRole;
}) {
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  if (selectedBoardId) {
    const board = boards.find((b) => b.id === selectedBoardId);
    return (
      <div className="flex-1 overflow-y-auto bg-cream dark:bg-dark-bg p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedBoardId(null)}
            className="flex items-center gap-1.5 text-sm text-navy/50 dark:text-slate-400 hover:text-navy dark:hover:text-slate-200 mb-4 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to boards
          </button>
          <h2 className="text-lg font-heading font-semibold text-navy dark:text-slate-100 mb-4">
            {board?.name || 'Board'} - Permissions
          </h2>
          <BoardPermissions boardId={selectedBoardId} currentUserRole={userRole} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-cream dark:bg-dark-bg p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <p className="text-navy/60 dark:text-slate-400 font-body text-sm mb-6">
          Select a board to manage its member permissions and column move rules.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => setSelectedBoardId(board.id)}
              className="group flex items-center gap-3 p-4 rounded-xl border-2 border-cream-dark dark:border-slate-700 bg-white dark:bg-dark-surface hover:border-electric/30 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-electric/10 flex items-center justify-center text-lg shrink-0">
                {BOARD_TYPE_ICONS[board.board_type] || '📌'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-navy dark:text-slate-100 text-sm truncate group-hover:text-electric transition-colors">
                  {board.name}
                </div>
                <div className="text-xs text-navy/40 dark:text-slate-500 capitalize">
                  {board.board_type?.replace(/_/g, ' ') || 'board'}
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-navy/20 group-hover:text-electric transition-colors shrink-0">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
          {boards.length === 0 && (
            <div className="col-span-full text-center py-12 text-navy/40 dark:text-slate-500 text-sm">
              No boards yet. Create a board first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
