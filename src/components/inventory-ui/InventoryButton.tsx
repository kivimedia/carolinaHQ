'use client';

import React from 'react';
import { Button, type ButtonProps } from '@/components/ui-shadcn/button';
import { cn } from '@/lib/utils';

type InventoryButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

const inventoryVariantMap: Record<InventoryButtonVariant, string> = {
  primary: 'bg-cb-pink hover:bg-cb-pink-dark text-white shadow-sm',
  secondary: 'bg-cb-gold hover:bg-cb-gold-dark text-white shadow-sm',
  outline: 'border-cb-pink-200 text-cb-pink-dark hover:bg-cb-pink-50',
  ghost: 'text-navy hover:bg-cb-pink-50 hover:text-cb-pink-dark',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
};

interface InventoryButtonProps extends Omit<ButtonProps, 'variant'> {
  inventoryVariant?: InventoryButtonVariant;
}

export function InventoryButton({
  className,
  inventoryVariant = 'primary',
  ...props
}: InventoryButtonProps) {
  return (
    <Button
      className={cn(
        'rounded-xl font-medium transition-all duration-200',
        inventoryVariantMap[inventoryVariant],
        className
      )}
      {...props}
    />
  );
}
