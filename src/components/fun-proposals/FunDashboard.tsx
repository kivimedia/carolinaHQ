'use client';

import { useState, lazy, Suspense } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Send, Clock, CheckCircle2, AlertCircle, Sparkles, TrendingUp, FileText, Loader2, Check, Trash2 } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import type { LucideProps } from "lucide-react";
import { Button } from "@/components/ui-shadcn/button";
import { Badge } from "@/components/ui-shadcn/badge";
import { useProposals, useDeleteProposal } from "@/hooks/fun/use-proposals";
import { useAcceptProposal } from "@/hooks/fun/use-accept-proposal";
import { useTags, useAllProposalTagAssignments } from "@/hooks/fun/use-tags";
import { formatDistanceToNow } from "date-fns";
import InlineChatPanel from "@/components/fun-proposals/chat/InlineChatPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui-shadcn/alert-dialog";

function DynIcon({ name, ...props }: { name: string } & Omit<LucideProps, 'ref'>) {
  const iconName = name as keyof typeof dynamicIconImports;
  if (!dynamicIconImports[iconName]) {
    const Fb = lazy(dynamicIconImports["tag"]);
    return <Suspense fallback={<div className="h-3 w-3" />}><Fb {...props} /></Suspense>;
  }
  const LI = lazy(dynamicIconImports[iconName]);
  return <Suspense fallback={<div className="h-3 w-3" />}><LI {...props} /></Suspense>;
}

const BUILT_IN_FILTERS = ["All", "Drafts", "Sent", "Won"] as const;

const STATUS_CONFIG: Record<string, { icon: typeof FileText; label: string; className: string }> = {
  draft: { icon: FileText, label: "Draft", className: "bg-muted text-muted-foreground" },
  ready: { icon: FileText, label: "Ready", className: "bg-muted text-muted-foreground" },
  sent: { icon: Send, label: "Sent", className: "bg-blue-100 text-blue-700" },
  viewed: { icon: AlertCircle, label: "Viewed", className: "bg-amber-100 text-amber-700" },
  accepted: { icon: CheckCircle2, label: "Won", className: "bg-emerald-100 text-emerald-700" },
  rejected: { icon: AlertCircle, label: "Rejected", className: "bg-red-100 text-red-700" },
  expired: { icon: Clock, label: "Expired", className: "bg-muted text-muted-foreground" },
};

const CONFIDENCE_CONFIG: Record<string, { label: string; className: string }> = {
  no_brainer: { label: "No-Brainer", className: "confidence-no-brainer" },
  suggested: { label: "Suggested", className: "confidence-suggested" },
  needs_human: { label: "Needs Human", className: "confidence-needs-human" },
};

export default function FunDashboard() {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const { data: proposals = [], isLoading, isError } = useProposals();
  const acceptProposal = useAcceptProposal();
  const deleteProposal = useDeleteProposal();
  const { data: allTags = [] } = useTags();
  const { data: tagAssignments = {} } = useAllProposalTagAssignments();

  const filteredProposals = proposals
    .filter((p) => {
      if (activeFilter === "All") return true;
      if (activeFilter === "Drafts") return p.status === "draft";
      if (activeFilter === "Sent") return p.status === "sent";
      if (activeFilter === "Won") return p.status === "accepted";
      // Check if filter is a tag id
      const tagIds = tagAssignments[p.id] || [];
      return tagIds.includes(activeFilter);
    })
    .sort((a, b) => {
      if (a.status === "accepted" && b.status !== "accepted") return -1;
      if (b.status === "accepted" && a.status !== "accepted") return 1;
      return 0;
    });

  const stats = {
    inQueue: proposals.filter((p) => p.status === "draft").length,
    sentThisWeek: proposals.filter((p) => p.status === "sent").length,
    pipelineValue: proposals.reduce((sum, p) => sum + (p.total || 0), 0),
    won: proposals.filter((p) => p.status === "accepted").length,
  };

  return (
    <div className="flex-1 overflow-auto p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Proposal Maker</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage, review, and send proposals
          </p>
        </div>
        <Link href="/proposals/new">
          <Button className="gap-2 shadow-md">
            <Plus className="h-4 w-4" />
            New Proposal
          </Button>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "In Queue", value: String(stats.inQueue), icon: Clock, color: "text-primary" },
          { label: "Sent", value: String(stats.sentThisWeek), icon: Send, color: "text-blue-600" },
          { label: "Won", value: String(stats.won), icon: TrendingUp, color: "text-emerald-600" },
          { label: "Pipeline Value", value: `$${stats.pipelineValue.toLocaleString()}`, icon: Sparkles, color: "text-gold" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className={`mt-2 font-mono text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters: built-in + custom tags */}
      <div className="mb-6 flex flex-wrap gap-2">
        {BUILT_IN_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              activeFilter === filter
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {filter}
          </button>
        ))}
        {allTags.length > 0 && (
          <div className="mx-1 h-6 w-px bg-border self-center" />
        )}
        {allTags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => setActiveFilter(activeFilter === tag.id ? "All" : tag.id)}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all border ${
              activeFilter === tag.id
                ? "shadow-sm"
                : "border-transparent opacity-60 hover:opacity-90"
            }`}
            style={{
              backgroundColor: activeFilter === tag.id ? tag.color + "20" : "transparent",
              borderColor: activeFilter === tag.id ? tag.color : "transparent",
              color: tag.color,
            }}
          >
            <DynIcon name={tag.icon} size={12} />
            {tag.name}
          </button>
        ))}
      </div>

      {/* Inline AI Chat */}
      <div className="mb-6">
        <InlineChatPanel />
      </div>

      {/* Proposal Cards */}
      {isLoading && !isError ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border-2 border-dashed border-destructive/30 p-12 text-center">
          <p className="text-sm text-destructive">Failed to load proposals. Please refresh the page.</p>
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {proposals.length === 0 ? "No proposals yet. Create your first one!" : "No proposals match this filter."}
          </p>
          {proposals.length === 0 && (
            <Link href="/proposals/new">
              <Button className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> New Proposal
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProposals.map((proposal, i) => {
            const status = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;
            const confidence = proposal.confidence_tier
              ? CONFIDENCE_CONFIG[proposal.confidence_tier]
              : null;
            const createdAgo = proposal.created_at
              ? formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true })
              : "";
            const proposalTagIds = tagAssignments[proposal.id] || [];
            const proposalTags = allTags.filter((t) => proposalTagIds.includes(t.id));

            return (
              <Link key={proposal.id} href={`/proposals/new?edit=${proposal.id}`} className="block">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass-card group cursor-pointer p-5 transition-all hover:shadow-md hover:product-card-glow ${
                    proposal.status === "accepted"
                      ? "ring-2 ring-emerald-400/60 bg-emerald-50/30 dark:bg-emerald-950/20"
                      : ""
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-semibold text-foreground">
                          {proposal.client_name || "Untitled"}
                        </h3>
                        {proposal.proposal_number && (
                          <span className="font-mono text-xs text-muted-foreground">{proposal.proposal_number}</span>
                        )}
                        {confidence && (
                          <Badge variant="outline" className={confidence.className}>
                            {confidence.label}
                          </Badge>
                        )}
                        <Badge variant="outline" className={status.className}>
                          <status.icon className="mr-1 h-3 w-3" />
                          {status.label}
                        </Badge>
                        {/* Tag badges */}
                        {proposalTags.map((tag) => (
                          <span
                            key={tag.id}
                            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: tag.color + "20",
                              color: tag.color,
                            }}
                          >
                            <DynIcon name={tag.icon} size={10} />
                            {tag.name}
                          </span>
                        ))}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {proposal.event_type || "No event type"} · {proposal.event_date || "No date"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-mono text-xl font-bold text-foreground">
                          ${(proposal.total || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">{createdAgo}</p>
                      </div>
                      {proposal.status !== "accepted" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            acceptProposal.mutate(proposal.id);
                          }}
                        >
                          <Check className="h-3 w-3" /> Mark Won
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this proposal?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the proposal for &quot;{proposal.client_name || "Untitled"}&quot;. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteProposal.mutate(proposal.id);
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button variant="outline" size="sm" className="opacity-0 transition-opacity group-hover:opacity-100">
                        Review →
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
