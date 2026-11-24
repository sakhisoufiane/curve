import { Card } from '@/components/card';
import type { SummaryCardColor } from '@/lib/curve-color-types';
import { SUMMARY_CARD_COLORS, SUMMARY_CARD_COLOR_MAP } from '@/lib/curve-color-types';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/index';

interface SummaryCardProps extends React.ComponentProps<typeof Card> {
  title: string;
  value: string;
  color?: SummaryCardColor;
  isLoading?: boolean;
  isError?: boolean;
  align?: 'left' | 'center' | 'right';
  chevron?: boolean;
}

export const SummaryCard = ({
  title,
  value,
  color = SUMMARY_CARD_COLORS.PRIMARY,
  className,
  isLoading = false,
  isError = false,
  align = 'left',
  chevron = false,
  ref,
  ...props
}: SummaryCardProps) => {
  return (
    <Card ref={ref} className={`h-[100px] p-0 ${SUMMARY_CARD_COLOR_MAP[color]} ${className || ''}`} {...props}>
      <div
        className={`flex flex-col justify-between h-full px-6 py-4 ${
          align === 'left' ? 'items-start' : align === 'center' ? 'items-center' : 'items-end'
        }`}
      >
        <p className="text-white text-xs uppercase tracking-wide flex items-center gap-1">
          {title} {chevron && <ChevronRight size={22} />}
        </p>

        <div className="h-8 flex items-center">
          {isLoading ? (
            <Skeleton className="h-6 w-20" />
          ) : isError ? (
            <AlertCircle className="h-6 w-6 text-white/70" />
          ) : (
            <p className="text-white text-2xl leading-none tracking-wide">{value}</p>
          )}
        </div>
      </div>
    </Card>
  );
};
