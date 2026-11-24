import React from 'react';
import { Button } from '../../components/button';
import { Plus } from 'lucide-react';

interface CreateButtonProps {
  entityName: string;
  onClick: () => void;
}

export function CreateButton({ entityName, onClick }: CreateButtonProps) {
  return (
    <Button className="gap-1.5" onClick={onClick}>
      <Plus className="size-4" />
      New {entityName}
    </Button>
  );
}

export type { CreateButtonProps };
