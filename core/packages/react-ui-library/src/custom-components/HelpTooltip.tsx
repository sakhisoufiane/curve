import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/tooltip';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  text: string;
}

export function HelpTooltip({ text }: HelpTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="size-3.5 shrink-0 cursor-help text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-center">{text}</TooltipContent>
    </Tooltip>
  );
}

export type { HelpTooltipProps };
