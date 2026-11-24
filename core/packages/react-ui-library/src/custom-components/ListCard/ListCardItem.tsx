import React from 'react';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { Separator } from '@/components/separator';
import { cn } from '@/lib/utils';

interface ListCardItemProps extends React.ComponentProps<'div'> {
  label: string;
  value?: string;
  badge?: string;
  href?: string;
  onClick?: () => void;
  showSeparator?: boolean;
}

export const ListCardItem = ({ label, value, badge, href, onClick, showSeparator = true, ref, className, ...props }: ListCardItemProps) => {
  const content = (
    <div ref={ref} className={cn('flex items-center py-1 min-w-0', className)} {...props}>
      <div className="flex-1 min-w-0 overflow-hidden">
        {href ? (
          <Button
            variant="link"
            className="text-primary p-0 h-auto text-left justify-start hover:text-primary-dark truncate"
            asChild
          >
            <a href={href} className="truncate block">
              {label}
            </a>
          </Button>
        ) : (
          <Button
            variant="link"
            className="text-primary p-0 h-auto text-left justify-start hover:text-primary-dark truncate"
            onClick={onClick}
          >
            <span className="truncate block">{label}</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 ml-4 shrink-0">
        {badge && (
          <Badge variant="secondary" className="bg-primary text-primary-foreground text-xs shrink-0">
            {badge}
          </Badge>
        )}
        {value && (
          <span className="text-foreground font-medium text-sm whitespace-nowrap" title={value}>
            {value}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <>
      {content}
      {showSeparator && <Separator />}
    </>
  );
};

export default ListCardItem;
