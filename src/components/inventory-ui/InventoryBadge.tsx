'use client';

import React from 'react';
import { Badge } from '@/components/ui-shadcn/badge';
import { cn } from '@/lib/utils';

type InventoryBadgeVariant = 'pink' | 'gold' | 'success' | 'warning' | 'danger' | 'muted';

const variantClasses: Record<InventoryBadgeVariant, string> = {
  pink: 'bg-cb-pink-100 text-cb-pink-dark border-cb-pink-200 hover:bg-cb-pink-200',
  gold: 'bg-cb-gold-muted text-cb-gold-dark border-cb-gold-light hover:bg-cb-gold-light/30',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  danger: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
  muted: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200',
};

interface InventoryBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: InventoryBadgeVariant;
}

export function InventoryBadge({ className, variant = 'pink', ...props }: InventoryBadgeProps) {
  return (
    <Badge
      className={cn(
        'font-medium rounded-full border',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
