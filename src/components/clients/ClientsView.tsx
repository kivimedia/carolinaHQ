'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, MoreHorizontal, Mail, Phone, Building2, Users, AlertCircle,
  RefreshCw, Trophy, Repeat, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { Input } from '@/components/ui-shadcn/input';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { Badge } from '@/components/ui-shadcn/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui-shadcn/dropdown-menu';
import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { cn } from '@/lib/utils';
import {
  useClientsWithFullStats,
  useTopSpenders,
  useTopRepeatClients,
  useClientsWithOutstanding,
  useDeleteClient,
  type ClientWithFullStats,
} from '@/hooks/inventory/useClients';
import { ClientLeaderboardCard } from './ClientLeaderboardCard';
import { ClientTagsList } from './ClientTagBadge';
import { ClientFiltersPanel, defaultClientFilters, type ClientFilters } from './ClientFiltersPanel';
import { AddClientDialog } from './AddClientDialog';

type SortField = 'name' | 'project_count' | 'total_revenue' | 'outstanding_balance';
type SortDir = 'asc' | 'desc';

export default function ClientsView() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [filters, setFilters] = useState<ClientFilters>(defaultClientFilters);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const { data: clients, isLoading, error, refetch } = useClientsWithFullStats();
  const { data: topSpenders } = useTopSpenders(10);
  const { data: topRepeat } = useTopRepeatClients(10);
  const { data: topOutstanding } = useClientsWithOutstanding(10);
  const deleteClient = useDeleteClient();

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir(field === 'name' ? 'asc' : 'desc'); }
  };

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    clients?.forEach((c) => (c.tags || []).forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [clients]);

  const filtered = useMemo(() => {
    const list = (clients || []).filter((c) => {
      const q = search.toLowerCase();
      if (q && !c.name.toLowerCase().includes(q) && !c.email?.toLowerCase().includes(q) && !c.company?.toLowerCase().includes(q)) return false;
      if (filters.tags.length > 0 && !filters.tags.some((t) => (c.tags || []).includes(t))) return false;
      if (filters.minSpending !== null && c.total_revenue < filters.minSpending) return false;
      if (filters.maxSpending !== null && c.total_revenue > filters.maxSpending) return false;
      if (filters.minProjects !== null && c.project_count < filters.minProjects) return false;
      if (filters.maxProjects !== null && c.project_count > filters.maxProjects) return false;
      if (filters.hasOutstanding && c.outstanding_balance <= 0) return false;
      return true;
    });
    return list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'project_count': cmp = a.project_count - b.project_count; break;
        case 'total_revenue': cmp = a.total_revenue - b.total_revenue; break;
        case 'outstanding_balance': cmp = a.outstanding_balance - b.outstanding_balance; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [clients, search, filters, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  return (
    <InventoryPageLayout
      title="Clients"
      description="Manage your client relationships and track spending."
      actions={
        <InventoryButton inventoryVariant="primary" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Client
        </InventoryButton>
      }
    >
      <AddClientDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      {/* Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ClientLeaderboardCard title="Top Spenders" icon={<Trophy className="h-4 w-4 text-amber-500" />} clients={topSpenders || []} valueFormatter={(c) => fmt(c.total_revenue)} valueLabel="revenue" emptyMessage="No client revenue yet" accentColor="gold" />
        <ClientLeaderboardCard title="Most Events" icon={<Repeat className="h-4 w-4 text-blue-500" />} clients={topRepeat || []} valueFormatter={(c) => `${c.project_count} events`} valueLabel="total" emptyMessage="No events yet" accentColor="blue" />
        <ClientLeaderboardCard title="Outstanding Balances" icon={<AlertTriangle className="h-4 w-4 text-red-500" />} clients={topOutstanding || []} valueFormatter={(c) => fmt(c.outstanding_balance)} valueLabel="owed" emptyMessage="No outstanding balances" accentColor="red" />
      </div>

      {/* Search + Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search clients..." className="pl-9 border-cb-pink-100" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <ClientFiltersPanel filters={filters} onFiltersChange={setFilters} availableTags={availableTags} />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="rounded-2xl border border-cb-pink-100 bg-white p-8">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load clients</h3>
          <p className="mt-2 text-muted-foreground">{(error as Error).message}</p>
          <InventoryButton inventoryVariant="ghost" className="mt-4 gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" /> Try Again
          </InventoryButton>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-cb-pink-100 bg-white p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-navy">No clients</h3>
          <p className="mt-2 text-muted-foreground">
            {search ? 'No clients match your search.' : 'Get started by adding your first client.'}
          </p>
          {!search && (
            <InventoryButton inventoryVariant="primary" className="mt-4 gap-2" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Add Client
            </InventoryButton>
          )}
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && filtered.length > 0 && (
        <div className="rounded-2xl border border-cb-pink-100 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cb-pink-100 text-left">
                <th className="px-4 py-3 cursor-pointer hover:bg-cb-pink-50/50" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1 text-navy font-semibold">Client <SortIcon field="name" /></div>
                </th>
                <th className="px-4 py-3 text-navy font-semibold">Contact</th>
                <th className="px-4 py-3 text-navy font-semibold">Tags</th>
                <th className="px-4 py-3 text-center cursor-pointer hover:bg-cb-pink-50/50" onClick={() => handleSort('project_count')}>
                  <div className="flex items-center justify-center gap-1 text-navy font-semibold">Events <SortIcon field="project_count" /></div>
                </th>
                <th className="px-4 py-3 text-right cursor-pointer hover:bg-cb-pink-50/50" onClick={() => handleSort('total_revenue')}>
                  <div className="flex items-center justify-end gap-1 text-navy font-semibold">Revenue <SortIcon field="total_revenue" /></div>
                </th>
                <th className="px-4 py-3 text-right cursor-pointer hover:bg-cb-pink-50/50" onClick={() => handleSort('outstanding_balance')}>
                  <div className="flex items-center justify-end gap-1 text-navy font-semibold">Outstanding <SortIcon field="outstanding_balance" /></div>
                </th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-cb-pink-50 cursor-pointer hover:bg-cb-pink-50/30 transition-colors" onClick={() => router.push(`/clients/${c.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cb-pink/10 text-sm font-medium text-cb-pink">
                        {getInitials(c.name)}
                      </div>
                      <div>
                        <p className="font-medium text-navy">{c.name}</p>
                        {c.company && <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{c.company}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {c.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /><span className="truncate max-w-[180px]">{c.email}</span></div>}
                      {c.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{c.phone}</div>}
                      {!c.email && !c.phone && <span className="text-muted-foreground/50">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {(c.tags || []).length > 0 ? <ClientTagsList tags={c.tags || []} maxVisible={2} /> : <span className="text-muted-foreground/50">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{c.project_count}</td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt(c.total_revenue)}</td>
                  <td className="px-4 py-3 text-right">
                    {c.outstanding_balance > 0 ? (
                      <Badge variant="destructive" className="font-semibold">{fmt(c.outstanding_balance)}</Badge>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-cb-pink-50">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/clients/${c.id}`)}>View Details</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => deleteClient.mutate(c.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Count */}
      {!isLoading && !error && filtered.length > 0 && (
        <p className="text-sm text-muted-foreground mt-3">
          Showing {filtered.length} of {clients?.length || 0} clients
        </p>
      )}
    </InventoryPageLayout>
  );
}
