// packages/react-ui-library/src/components/curve-breadcrumb.tsx
import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/breadcrumb';
import { cn } from '../lib/utils';

export interface CurveBreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

interface CurveBreadcrumbProps extends React.ComponentProps<typeof Breadcrumb> {
  items: CurveBreadcrumbItem[];
}

export const CurveBreadcrumb = ({ items, className, ref, ...props }: CurveBreadcrumbProps) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Breadcrumb ref={ref} className={cn('h-12 flex items-center px-6 bg-muted', className)} {...props}>
      <BreadcrumbList className="flex items-center space-x-2 text-sm">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem>
              {item.href && !item.isActive ? (
                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < items.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default CurveBreadcrumb;
