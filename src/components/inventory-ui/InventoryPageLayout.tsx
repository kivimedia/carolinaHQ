'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface InventoryPageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function InventoryPageLayout({
  children,
  title,
  description,
  actions,
  className,
}: InventoryPageLayoutProps) {
  return (
    <div className={cn('flex-1 overflow-auto bg-inventory-bg', className)}>
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
