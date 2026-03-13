'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Send, Clock, CheckCircle2, AlertCircle, FileText, Loader2, Check, Trash2, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui-shadcn/button';
import { Badge } from '@/components/ui-shadcn/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui-shadcn/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui-shadcn/alert-dialog';
import { useProposals, useDeleteProposal } from '@/hooks/fun/use-proposals';
import { useAcceptProposal } from '@/hooks/fun/use-accept-proposal';
import { formatDistanceToNow } from 'date-fns';
import ProposalQueueView from '@/components/proposals/ProposalQueueView';
import ProposalLearningView from '@/components/proposals/ProposalLearningView';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  ready: { label: 'Ready', variant: 'secondary' },
  sent: { label: 'Sent', variant: 'default' },
  viewed: { label: 'Viewed', variant: 'outline' },
  accepted: { label: 'Won', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  expired: { label: 'Expired', variant: 'secondary' },
};

type Tab = 'proposals' | 'queue' | 'learning';

export default function ClassicDashboard() {
  const [tab, setTab] = useState<Tab>('proposals');
  const [filter, setFilter] = useState('All');
  const { data: proposals = [], isLoading, isError } = useProposals();
  const deleteProposal = useDeleteProposal();
  const acceptProposal = useAcceptProposal();

  const filtered = proposals.filter((p) => {
    if (filter === 'All') return true;
    if (filter === 'Drafts') return p.status === 'draft' || p.status === 'ready';
    if (filter === 'Sent') return p.status === 'sent';
    if (filter === 'Won') return p.status === 'accepted';
    return true;
  });

  const stats = {
    drafts: proposals.filter((p) => p.status === 'draft' || p.status === 'ready').length,
    sent: proposals.filter((p) => p.status === 'sent').length,
    won: proposals.filter((p) => p.status === 'accepted').length,
    pipeline: proposals.reduce((sum, p) => sum + (p.total || 0), 0),
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Tab navigation */}
      <div className="border-b px-4 sm:px-6 bg-white dark:bg-dark-surface flex items-center justify-between">
        <nav className="flex gap-1 -mb-px">
          {([
            { id: 'proposals' as const, label: 'Proposals', icon: FileText },
            { id: 'queue' as const, label: 'AI Queue', icon: Sparkles },
            { id: 'learning' as const, label: 'Learning', icon: TrendingUp },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                tab === t.id
                  ? 'border-cb-pink text-cb-pink'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </nav>
        {tab === 'proposals' && (
          <Link href="/proposals/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Proposal
            </Button>
          </Link>
        )}
      </div>

      {tab === 'queue' ? (
        <ProposalQueueView />
      ) : tab === 'learning' ? (
        <ProposalLearningView />
      ) : (
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Drafts', value: stats.drafts, icon: Clock },
              { label: 'Sent', value: stats.sent, icon: Send },
              { label: 'Won', value: stats.won, icon: CheckCircle2 },
              { label: 'Pipeline', value: `$${stats.pipeline.toLocaleString()}`, icon: TrendingUp },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Quick nav */}
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <Link href="/proposals/products" className="text-primary hover:underline">Products</Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/proposals/templates" className="text-primary hover:underline">Templates</Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/proposals/options" className="text-primary hover:underline">Options</Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/proposals/settings" className="text-primary hover:underline">Settings</Link>
          </div>

          {/* Filters */}
          <div className="mb-4 flex gap-2">
            {['All', 'Drafts', 'Sent', 'Won'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {isLoading && !isError ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="rounded-lg border-2 border-dashed border-destructive/30 p-12 text-center">
              <p className="text-sm text-destructive">Failed to load proposals. Please refresh the page.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed p-12 text-center">
              <p className="text-sm text-muted-foreground">
                {proposals.length === 0 ? 'No proposals yet.' : 'No proposals match this filter.'}
              </p>
              {proposals.length === 0 && (
                <Link href="/proposals/new">
                  <Button className="mt-4 gap-2" size="sm">
                    <Plus className="h-4 w-4" /> New Proposal
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
                    return (
                      <TableRow key={p.id} className={p.status === 'accepted' ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}>
                        <TableCell className="font-medium">
                          <Link href={`/proposals/new?edit=${p.id}`} className="hover:underline">
                            {p.client_name || 'Untitled'}
                          </Link>
                          {p.proposal_number && (
                            <span className="ml-2 text-xs text-muted-foreground font-mono">{p.proposal_number}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{p.event_type || '-'}</TableCell>
                        <TableCell className="text-sm">{p.event_date || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          ${(p.total || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.created_at ? formatDistanceToNow(new Date(p.created_at), { addSuffix: true }) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/proposals/new?edit=${p.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs">Edit</Button>
                            </Link>
                            {p.status !== 'accepted' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => acceptProposal.mutate(p.id)}
                              >
                                <Check className="h-3 w-3" /> Won
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete proposal?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the proposal for &quot;{p.client_name || 'Untitled'}&quot;.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteProposal.mutate(p.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
