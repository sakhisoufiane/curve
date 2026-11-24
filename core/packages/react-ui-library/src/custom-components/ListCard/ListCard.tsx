import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { ListCardItem } from './ListCardItem';
import { Spinner } from '@/components/spinner';
import { Flex } from '@/components/flex';
import { AlertCircle } from 'lucide-react';

interface ListCardProps extends React.ComponentProps<typeof Card> {
  title: string;
  items: Array<{
    label: string;
    value?: string;
    href?: string;
    badge?: string;
  }>;
  isLoading?: boolean;
  isError?: boolean;
}

export const ListCard = ({ title, items, isLoading = false, isError = false, ref, ...props }: ListCardProps) => {
  return (
    <Card ref={ref} {...props}>
      <CardHeader>
        <CardTitle className="font-bold uppercase">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Flex justify="center" align="center" className="py-8">
            <Spinner color="black" size="xl" />
          </Flex>
        ) : isError ? (
          <Flex justify="center" align="center" direction="col" gap="sm" className="py-8">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Failed to load</p>
          </Flex>
        ) : (
          items.map((item, index) => (
            <ListCardItem
              key={item.label}
              label={item.label}
              value={item.value}
              href={item.href}
              badge={item.badge}
              showSeparator={index < items.length - 1}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default ListCard;
