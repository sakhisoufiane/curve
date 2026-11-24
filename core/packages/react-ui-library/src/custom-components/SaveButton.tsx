import React from 'react';
import { Save } from 'lucide-react';
import { Button } from '../components/button';
import { Spinner } from '../components/spinner';
import { cn } from '../lib/utils';

interface SaveButtonProps {
  onClick: () => void;
  isPending?: boolean;
}

export function SaveButton({ onClick, isPending = false }: SaveButtonProps) {
  return (
    <Button onClick={onClick} disabled={isPending} className="relative">
      <span className={cn('flex items-center gap-1.5', isPending && 'invisible')}>
        <Save className="size-4" />
        Save
      </span>
      {isPending && <Spinner className="absolute inset-0 m-auto" />}
    </Button>
  );
}

export type { SaveButtonProps };
