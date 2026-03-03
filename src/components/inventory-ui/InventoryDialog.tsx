'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui-shadcn/dialog';
import { cn } from '@/lib/utils';

export function InventoryDialog(props: React.ComponentProps<typeof Dialog>) {
  return <Dialog {...props} />;
}

export function InventoryDialogTrigger(props: React.ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger {...props} />;
}

export function InventoryDialogClose(props: React.ComponentProps<typeof DialogClose>) {
  return <DialogClose {...props} />;
}

export function InventoryDialogContent({ className, ...props }: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(
        'bg-white rounded-2xl border-cb-pink-100 shadow-modal sm:max-w-lg',
        className
      )}
      {...props}
    />
  );
}

export function InventoryDialogHeader({ className, ...props }: React.ComponentProps<typeof DialogHeader>) {
  return <DialogHeader className={cn('', className)} {...props} />;
}

export function InventoryDialogTitle({ className, ...props }: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle className={cn('text-navy font-bold', className)} {...props} />;
}

export function InventoryDialogDescription({ className, ...props }: React.ComponentProps<typeof DialogDescription>) {
  return <DialogDescription className={cn('text-muted-foreground', className)} {...props} />;
}

export function InventoryDialogFooter({ className, ...props }: React.ComponentProps<typeof DialogFooter>) {
  return <DialogFooter className={cn('border-t border-cb-pink-100 pt-4 mt-4', className)} {...props} />;
}
