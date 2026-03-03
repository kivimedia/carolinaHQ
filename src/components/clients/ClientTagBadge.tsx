'use client';

import { X } from 'lucide-react';
import { Badge } from '@/components/ui-shadcn/badge';
import { cn } from '@/lib/utils';

const tagColors: Record<string, string> = {
  vip: 'bg-amber-100 text-amber-800 border-amber-300',
  priority: 'bg-red-100 text-red-800 border-red-300',
  corporate: 'bg-blue-100 text-blue-800 border-blue-300',
  wedding: 'bg-pink-100 text-pink-800 border-pink-300',
  nonprofit: 'bg-green-100 text-green-800 border-green-300',
  recurring: 'bg-purple-100 text-purple-800 border-purple-300',
  referral: 'bg-orange-100 text-orange-800 border-orange-300',
  default: 'bg-cb-pink-50 text-cb-pink-dark border-cb-pink-100',
};

function getTagColor(tag: string) {
  return tagColors[tag.toLowerCase()] || tagColors.default;
}

interface ClientTagBadgeProps {
  tag: string;
  onRemove?: () => void;
  className?: string;
}

export function ClientTagBadge({ tag, onRemove, className }: ClientTagBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 px-2 py-0.5 text-xs font-medium', getTagColor(tag), className)}
    >
      {tag}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 rounded-full hover:bg-black/10"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}

interface ClientTagsListProps {
  tags: string[];
  onRemove?: (tag: string) => void;
  maxVisible?: number;
  className?: string;
}

export function ClientTagsList({ tags, onRemove, maxVisible = 3, className }: ClientTagsListProps) {
  const visible = tags.slice(0, maxVisible);
  const hidden = tags.length - maxVisible;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visible.map((tag) => (
        <ClientTagBadge key={tag} tag={tag} onRemove={onRemove ? () => onRemove(tag) : undefined} />
      ))}
      {hidden > 0 && (
        <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
          +{hidden}
        </Badge>
      )}
    </div>
  );
}
