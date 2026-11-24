import React from 'react';
import { ExternalLink } from 'lucide-react';

export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  helpLink?: string;
  helpLinkText?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  helpLink,
  helpLinkText = 'Learn more',
  children,
}) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
    <div className="rounded-full bg-muted p-4">
      <Icon className="size-8 text-muted-foreground" />
    </div>
    <div className="space-y-1">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground max-w-xs">{description}</p>}
    </div>
    {children && <div className="flex items-center gap-2">{children}</div>}
    {helpLink && (
      <a
        href={helpLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ExternalLink className="size-3" />
        {helpLinkText}
      </a>
    )}
  </div>
);
