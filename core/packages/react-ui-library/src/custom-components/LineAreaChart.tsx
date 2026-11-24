import React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/chart';
import { cn } from '../lib/utils';

export const description = 'A simple area chart';
interface LineAreaChartProps extends React.ComponentProps<typeof Card> {
  title: string;
  description: string;
  data: unknown[];
  config: ChartConfig;
  height?: number;
  width?: number;
}

export const LineAreaChart = ({
  title,
  description,
  data,
  config,
  className,
  height,
  width,
  ref,
  ...props
}: LineAreaChartProps) => {
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
    }).format(value);
  };

  return (
    <Card ref={ref} className={cn('w-full', className)} {...props}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            width={width || undefined}
            height={height || undefined}
            margin={{
              left: 12,
              right: 12,
              top: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatNumber}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Area
              dataKey="desktop"
              type="natural"
              fill="var(--color-desktop)"
              fillOpacity={0.4}
              stroke="var(--color-desktop)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
