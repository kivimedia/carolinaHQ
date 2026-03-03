'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui-shadcn/card';
import { cn } from '@/lib/utils';

interface InventoryCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function InventoryCard({ className, children, ...props }: InventoryCardProps) {
  return (
    <Card
      className={cn(
        'bg-white border-cb-pink-100 shadow-card hover:shadow-card-hover transition-shadow duration-200 rounded-2xl',
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

export function InventoryCardHeader({ className, ...props }: React.ComponentProps<typeof CardHeader>) {
  return <CardHeader className={cn('pb-3', className)} {...props} />;
}

export function InventoryCardTitle({ className, ...props }: React.ComponentProps<typeof CardTitle>) {
  return <CardTitle className={cn('text-lg font-semibold text-navy', className)} {...props} />;
}

export function InventoryCardDescription({ className, ...props }: React.ComponentProps<typeof CardDescription>) {
  return <CardDescription className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function InventoryCardContent({ className, ...props }: React.ComponentProps<typeof CardContent>) {
  return <CardContent className={cn('', className)} {...props} />;
}

export function InventoryCardFooter({ className, ...props }: React.ComponentProps<typeof CardFooter>) {
  return <CardFooter className={cn('border-t border-cb-pink-100 pt-4', className)} {...props} />;
}
