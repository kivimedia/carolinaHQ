'use client';

import { useRouter } from 'next/navigation';
import { Crown, Medal, ChevronRight } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { cn } from '@/lib/utils';
import type { ClientWithFullStats } from '@/hooks/inventory/useClients';

interface ClientLeaderboardCardProps {
  title: string;
  icon: React.ReactNode;
  clients: ClientWithFullStats[];
  valueFormatter: (client: ClientWithFullStats) => string;
  valueLabel: string;
  emptyMessage: string;
  accentColor: 'gold' | 'blue' | 'red';
  onViewAll?: () => void;
}

const rankIcons = [
  <Crown key="1" className="h-4 w-4 text-amber-500" />,
  <Medal key="2" className="h-4 w-4 text-slate-400" />,
  <Medal key="3" className="h-4 w-4 text-amber-700" />,
];

const accentColors = {
  gold: 'border-l-amber-500 bg-amber-50/50',
  blue: 'border-l-blue-500 bg-blue-50/50',
  red: 'border-l-red-500 bg-red-50/50',
};

export function ClientLeaderboardCard({
  title,
  icon,
  clients,
  valueFormatter,
  valueLabel,
  emptyMessage,
  accentColor,
  onViewAll,
}: ClientLeaderboardCardProps) {
  const router = useRouter();

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={cn('bg-white rounded-2xl border border-cb-pink-100 border-l-4 p-4', accentColors[accentColor])}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-navy">
          {icon}
          {title}
        </h3>
        {onViewAll && clients.length > 0 && (
          <InventoryButton inventoryVariant="ghost" className="h-7 text-xs px-2" onClick={onViewAll}>
            See All
            <ChevronRight className="ml-1 h-3 w-3" />
          </InventoryButton>
        )}
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {clients.slice(0, 5).map((client, i) => (
            <button
              key={client.id}
              onClick={() => router.push(`/clients/${client.id}`)}
              className="flex items-center gap-3 w-full rounded-xl p-2 text-left transition-colors hover:bg-cb-pink-50"
            >
              <div className="flex h-6 w-6 items-center justify-center">
                {i < 3 ? rankIcons[i] : <span className="text-xs font-medium text-muted-foreground">{i + 1}</span>}
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cb-pink/10 text-xs font-medium text-cb-pink">
                {getInitials(client.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy truncate">{client.name}</p>
                {client.company && <p className="text-xs text-muted-foreground truncate">{client.company}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{valueFormatter(client)}</p>
                <p className="text-xs text-muted-foreground">{valueLabel}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
