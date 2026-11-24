import React from 'react';
import { Button } from '../components/button';
import { ButtonGroup } from '../components/button-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/tooltip';
import { Upload } from 'lucide-react';

interface ImportButtonProps {
  variant?: 'icon' | 'default';
  onClick: () => void;
}

export function ImportButton({ variant = 'default', onClick }: ImportButtonProps) {
  if (variant === 'icon') {
    return (
      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={onClick}>
              <Upload />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import</TooltipContent>
        </Tooltip>
      </ButtonGroup>
    );
  }

  return (
    <Button variant="outline" className="gap-1.5" onClick={onClick}>
      <Upload className="size-3.5" />
      Import
    </Button>
  );
}

export type { ImportButtonProps };
