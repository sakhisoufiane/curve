import React from 'react';
import { Button } from '@/components/button';
import { cn } from '@/lib/utils';

export interface MobileMenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  destructive?: boolean;
}

export function MobileMenuItem({ icon, label, onClick, destructive = false }: MobileMenuItemProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        'w-full justify-start gap-3 h-auto py-3 text-sm font-normal',
        destructive && 'text-destructive hover:text-destructive'
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}
