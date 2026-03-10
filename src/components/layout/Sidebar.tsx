'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Board } from '@/lib/types';
import { BOARD_TYPE_CONFIG } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import Avatar from '@/components/ui/Avatar';
import { useAppStore } from '@/stores/app-store';
import { slugify } from '@/lib/slugify';

interface SidebarProps {
  initialBoards?: Board[];
}

// SVG icon components (inline to avoid lucide-react dependency in server layout)
const icons = {
  boards: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  proposals: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></>,
  venues: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
  marquee: <><rect x="2" y="6" width="4" height="12" rx="1" /><rect x="10" y="6" width="4" height="12" rx="1" /><rect x="18" y="6" width="4" height="12" rx="1" /></>,
  inventory: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
  events: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  clients: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  finances: <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
  reports: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
  myTasks: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
  performance: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></>,
  // Proposal sub-nav icons
  newProposal: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
  products: <><line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
  options: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
  templates: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></>,
  proposalSettings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
};

function Icon({ name, size = 18 }: { name: keyof typeof icons; size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

// Proposal sub-nav items that appear when Proposals is expanded
const PROPOSAL_SUB_NAV = [
  { href: '/proposals', label: 'Dashboard', icon: 'boards' as const, exact: true },
  { href: '/proposals/new', label: 'New Proposal', icon: 'newProposal' as const },
  { href: '/proposals/products', label: 'Products', icon: 'products' as const },
  { href: '/proposals/options', label: 'Options', icon: 'options' as const },
  { href: '/proposals/templates', label: 'Templates', icon: 'templates' as const },
  { href: '/proposals/settings', label: 'Settings', icon: 'proposalSettings' as const },
];

export default function Sidebar({ initialBoards }: SidebarProps = {}) {
  const [boards, setBoards] = useState<Board[]>(initialBoards || []);
  const [collapsed, setCollapsed] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const pathname = usePathname();
  const { profile, user, signOut } = useAuth();
  const supabase = createClient();
  const { presentUsers } = usePresence({ channelName: 'app:global' });
  const onlineOthers = presentUsers.filter(u => u.userId !== user?.id);
  const { mobileSidebarOpen, setMobileSidebarOpen } = useAppStore();

  const isOnProposals = pathname?.startsWith('/proposals');

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  const toggleStar = useCallback(async (e: React.MouseEvent, boardId: string, currentStarred: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, is_starred: !currentStarred } : b));
    await supabase.from('boards').update({ is_starred: !currentStarred }).eq('id', boardId);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    const fetchBoards = async () => {
      try {
        const res = await fetch('/api/boards');
        if (res.ok) {
          const json = await res.json();
          if (json.data && !cancelled) setBoards(json.data as Board[]);
        }
      } catch {
        // Network error
      }
    };

    fetchBoards();
    if (user) fetchBoards();

    const channel = supabase
      .channel('boards-sidebar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, () => {
        if (!cancelled) fetchBoards();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const navLinkClass = (active: boolean) => `
    flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200
    ${active ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}
  `;

  const subNavLinkClass = (active: boolean) => `
    flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
    ${active ? 'bg-pink-500/20 text-pink-300' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}
  `;

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    <aside
      className={`
        ${collapsed ? 'md:w-16' : 'md:w-64'}
        w-72
        h-screen bg-navy/95 backdrop-blur-xl
        border-r border-white/5
        flex flex-col
        transition-all duration-300 ease-out
        shrink-0
        fixed md:relative z-50 md:z-auto
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
    >
      {/* Header */}
      <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {collapsed ? (
          <Link href="/" className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">CB</span>
          </Link>
        ) : (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">CB</span>
            </div>
            <span className="text-white font-heading font-semibold text-lg">
              Carolina Balloons
            </span>
          </Link>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Collapse sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mb-2 text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          title="Expand sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
          </svg>
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {/* Boards */}
        <Link href="/" className={navLinkClass(pathname === '/')}>
          <Icon name="boards" />
          {!collapsed && <span>Boards</span>}
        </Link>

        {/* Settings */}
        <Link href="/settings" className={navLinkClass(pathname?.startsWith('/settings') || false)}>
          <Icon name="settings" />
          {!collapsed && <span>Settings</span>}
        </Link>

        {/* Proposals - with expandable sub-nav */}
        <div>
          <Link href="/proposals" className={navLinkClass(isOnProposals || false)}>
            <Icon name="proposals" />
            {!collapsed && (
              <>
                <span className="flex-1">Proposals</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${isOnProposals ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </>
            )}
          </Link>

          {/* Sub-nav items - visible when on proposals routes and sidebar expanded */}
          {!collapsed && isOnProposals && (
            <div className="ml-4 mt-1 mb-1 pl-3 border-l border-white/10 space-y-0.5">
              {PROPOSAL_SUB_NAV.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname?.startsWith(item.href) && !PROPOSAL_SUB_NAV.some(
                      (other) => other.href !== item.href && other.href.startsWith(item.href) && pathname?.startsWith(other.href)
                    );
                return (
                  <Link key={item.href} href={item.href} className={subNavLinkClass(isActive || false)}>
                    <Icon name={item.icon} size={14} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Venues */}
        <Link href="/venues" className={navLinkClass(pathname?.startsWith('/venues') || false)}>
          <Icon name="venues" />
          {!collapsed && <span>Venues</span>}
        </Link>

        {/* Marquee Letters */}
        <Link href="/marquee" className={navLinkClass(pathname?.startsWith('/marquee') || false)}>
          <Icon name="marquee" />
          {!collapsed && <span>Marquee Letters</span>}
        </Link>

        {/* Inventory */}
        <Link href="/inventory" className={navLinkClass(pathname?.startsWith('/inventory') || false)}>
          <Icon name="inventory" />
          {!collapsed && <span>Inventory</span>}
        </Link>

        {/* Events */}
        <Link href="/events" className={navLinkClass(pathname?.startsWith('/events') || false)}>
          <Icon name="events" />
          {!collapsed && <span>Events</span>}
        </Link>

        {/* Clients */}
        <Link href="/clients" className={navLinkClass(pathname?.startsWith('/clients') || false)}>
          <Icon name="clients" />
          {!collapsed && <span>Clients</span>}
        </Link>

        {/* Finances */}
        <Link href="/finances" className={navLinkClass(pathname?.startsWith('/finances') || false)}>
          <Icon name="finances" />
          {!collapsed && <span>Finances</span>}
        </Link>

        {/* Reports */}
        <Link href="/reports" className={navLinkClass(pathname?.startsWith('/reports') || false)}>
          <Icon name="reports" />
          {!collapsed && <span>Reports</span>}
        </Link>

        {/* My Tasks */}
        <Link href="/my-tasks" className={navLinkClass(pathname?.startsWith('/my-tasks') || false)}>
          <Icon name="myTasks" />
          {!collapsed && <span>My Tasks</span>}
        </Link>

        {/* Performance */}
        <Link href="/performance" className={navLinkClass(pathname?.startsWith('/performance') || false)}>
          <Icon name="performance" />
          {!collapsed && <span>Performance</span>}
        </Link>

        {/* Boards section */}
        {!collapsed && (
          <div className="pt-4 pb-2 px-3">
            <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">
              Boards
            </span>
          </div>
        )}

        {boards
          .filter((board) => !board.is_archived)
          .sort((a, b) => (a.is_starred === b.is_starred ? 0 : a.is_starred ? -1 : 1))
          .map((board) => {
          const config = BOARD_TYPE_CONFIG[board.type];
          const isActive = pathname === `/board/${slugify(board.name)}`;
          return (
            <Link
              key={board.id}
              href={`/board/${slugify(board.name)}`}
              className={`
                group/board flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200
                ${isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <span className="text-base">{config?.icon || '📋'}</span>
              {!collapsed && (
                <span className="truncate font-medium">{board.name}</span>
              )}
              {!collapsed && (
                <button
                  onClick={(e) => toggleStar(e, board.id, board.is_starred)}
                  className={`ml-auto shrink-0 transition-all ${
                    board.is_starred
                      ? 'text-yellow-400'
                      : 'text-white/0 group-hover/board:text-white/30 hover:!text-yellow-400'
                  }`}
                  title={board.is_starred ? 'Unstar board' : 'Star board'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={board.is_starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              )}
            </Link>
          );
        })}

        {/* Archived boards toggle */}
        {!collapsed && boards.some(b => b.is_archived) && (
          <>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 px-3 py-2 mt-2 text-[11px] text-white/30 hover:text-white/50 transition-colors w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points={showArchived ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
              </svg>
              <span>Archived ({boards.filter(b => b.is_archived).length})</span>
            </button>
            {showArchived && boards
              .filter(b => b.is_archived)
              .map((board) => {
                const config = BOARD_TYPE_CONFIG[board.type];
                const isActive = pathname === `/board/${slugify(board.name)}`;
                return (
                  <Link
                    key={board.id}
                    href={`/board/${slugify(board.name)}`}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 opacity-50
                      ${isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <span className="text-base">{config?.icon || '📋'}</span>
                    <span className="truncate font-medium">{board.name}</span>
                  </Link>
                );
              })
            }
          </>
        )}
      </nav>

      {/* Online users */}
      {!collapsed && onlineOthers.length > 0 && (
        <div className="px-3 py-2 border-t border-white/5">
          <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">
            Online ({onlineOthers.length})
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {onlineOthers.slice(0, 8).map((u) => (
              <div key={u.userId} className="relative" title={u.displayName}>
                <Avatar name={u.displayName} src={u.avatarUrl} size="sm" />
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full ring-1 ring-navy/95" />
              </div>
            ))}
            {onlineOthers.length > 8 && (
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-medium text-white/50">
                +{onlineOthers.length - 8}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User section */}
      <div className="p-3 border-t border-white/5">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          {profile && (
            <Avatar name={profile.display_name} src={profile.avatar_url} size="sm" />
          )}
          {!collapsed && profile && (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">
                {profile.display_name}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={signOut}
              className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Sign out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
