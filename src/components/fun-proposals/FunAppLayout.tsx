'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Package,
  Layers,
  Settings,
  Palette,
  ChevronLeft,
} from 'lucide-react';
import ChatPanel from './chat/ChatPanel';
import { BgRemovalProvider } from '@/contexts/BackgroundRemovalContext';

const NAV_ITEMS = [
  { href: '/proposals', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/proposals/products', label: 'Products', icon: Package },
  { href: '/proposals/templates', label: 'Templates', icon: FileText },
  { href: '/proposals/options', label: 'Options', icon: Layers },
  { href: '/proposals/settings', label: 'Settings', icon: Settings },
];

interface FunAppLayoutProps {
  children: React.ReactNode;
}

export default function FunAppLayout({ children }: FunAppLayoutProps) {
  const pathname = usePathname();

  return (
    <BgRemovalProvider>
    <div className="flex h-full overflow-hidden">
      {/* Fun sidebar nav */}
      <nav className="hidden md:flex w-52 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Palette className="h-5 w-5 text-primary" />
          <span className="font-display text-sm font-semibold text-foreground">Proposals</span>
        </div>

        <div className="flex-1 space-y-1 p-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/proposals' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="border-t border-border p-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            Back to boards
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>

      {/* Chat FAB */}
      <ChatPanel />
    </div>
    </BgRemovalProvider>
  );
}
