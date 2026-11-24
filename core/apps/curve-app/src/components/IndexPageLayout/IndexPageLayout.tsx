import React from 'react';
import { Icon } from '@curveroyaltysystems/react-ui-library';

interface IndexPageLayoutProps {
  title?: string;
  description?: string;
  helpLink?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

export const IndexPageLayout: React.FC<IndexPageLayoutProps> = ({
  title,
  description,
  helpLink,
  toolbar,
  children,
}) => {
  const hasHeader = title || description || helpLink;
  const hasTop = hasHeader || toolbar;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {hasTop && (
        <div className="px-6 sm:px-8 pt-6 sm:pt-8 shrink-0 space-y-4">
          {hasHeader && (
            <div className="flex items-start justify-between gap-4">
              <div>
                {title && <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>}
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
              </div>
              {helpLink && (
                <a
                  href={helpLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Icon.HelpCircle className="size-3.5" />
                  Knowledge Base
                  <Icon.ExternalLink className="size-3 opacity-50" />
                </a>
              )}
            </div>
          )}
          {toolbar && <div>{toolbar}</div>}
        </div>
      )}
      <div className={`flex-1 flex flex-col min-h-0 px-6 sm:px-8 pb-6 sm:pb-8 ${hasTop ? 'pt-4' : 'pt-6 sm:pt-8'}`}>
        {children}
      </div>
    </div>
  );
};
