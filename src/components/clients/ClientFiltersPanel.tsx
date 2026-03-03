'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Input } from '@/components/ui-shadcn/input';
import { Label } from '@/components/ui-shadcn/label';
import { Badge } from '@/components/ui-shadcn/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui-shadcn/popover';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { cn } from '@/lib/utils';

export interface ClientFilters {
  tags: string[];
  minSpending: number | null;
  maxSpending: number | null;
  minProjects: number | null;
  maxProjects: number | null;
  hasOutstanding: boolean;
}

export const defaultClientFilters: ClientFilters = {
  tags: [],
  minSpending: null,
  maxSpending: null,
  minProjects: null,
  maxProjects: null,
  hasOutstanding: false,
};

interface ClientFiltersPanelProps {
  filters: ClientFilters;
  onFiltersChange: (filters: ClientFilters) => void;
  availableTags: string[];
}

export function ClientFiltersPanel({ filters, onFiltersChange, availableTags }: ClientFiltersPanelProps) {
  const [open, setOpen] = useState(false);

  const activeCount = [
    filters.tags.length > 0,
    filters.minSpending !== null || filters.maxSpending !== null,
    filters.minProjects !== null || filters.maxProjects !== null,
    filters.hasOutstanding,
  ].filter(Boolean).length;

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <InventoryButton inventoryVariant="ghost" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <Badge className="ml-1 h-5 w-5 rounded-full p-0 text-xs bg-cb-pink text-white">{activeCount}</Badge>
            )}
          </InventoryButton>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-navy">Filters</h4>
              {activeCount > 0 && (
                <button className="text-xs text-muted-foreground hover:text-navy" onClick={() => onFiltersChange(defaultClientFilters)}>
                  Clear all
                </button>
              )}
            </div>

            {availableTags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={filters.tags.includes(tag) ? 'default' : 'outline'}
                      className={cn('cursor-pointer transition-colors', filters.tags.includes(tag) && 'bg-cb-pink text-white')}
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Total Spending</Label>
              <div className="flex items-center gap-2">
                <Input type="number" placeholder="Min" className="h-8 border-cb-pink-100" value={filters.minSpending ?? ''} onChange={(e) => onFiltersChange({ ...filters, minSpending: e.target.value ? Number(e.target.value) : null })} />
                <span className="text-muted-foreground">-</span>
                <Input type="number" placeholder="Max" className="h-8 border-cb-pink-100" value={filters.maxSpending ?? ''} onChange={(e) => onFiltersChange({ ...filters, maxSpending: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Event Count</Label>
              <div className="flex items-center gap-2">
                <Input type="number" placeholder="Min" className="h-8 border-cb-pink-100" value={filters.minProjects ?? ''} onChange={(e) => onFiltersChange({ ...filters, minProjects: e.target.value ? Number(e.target.value) : null })} />
                <span className="text-muted-foreground">-</span>
                <Input type="number" placeholder="Max" className="h-8 border-cb-pink-100" value={filters.maxProjects ?? ''} onChange={(e) => onFiltersChange({ ...filters, maxProjects: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasOutstanding}
                onChange={(e) => onFiltersChange({ ...filters, hasOutstanding: e.target.checked })}
                className="rounded border-cb-pink-100 text-cb-pink focus:ring-cb-pink"
              />
              <span className="text-sm">Has outstanding balance</span>
            </label>
          </div>
        </PopoverContent>
      </Popover>

      {filters.tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1">
          {tag}
          <button onClick={() => handleTagToggle(tag)}><X className="h-3 w-3" /></button>
        </Badge>
      ))}
      {filters.hasOutstanding && (
        <Badge variant="secondary" className="gap-1">
          Has Balance
          <button onClick={() => onFiltersChange({ ...filters, hasOutstanding: false })}><X className="h-3 w-3" /></button>
        </Badge>
      )}
    </div>
  );
}
