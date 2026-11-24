import { Skeleton } from '@curveroyaltysystems/react-ui-library';
import { FormGrid } from './FormGrid';

type Cols = 2 | 3 | 4;

interface FormGridSkeletonProps {
  cols?: Cols;
  /** Number of skeleton fields. Defaults to cols * 2. */
  count?: number;
}

export function FormGridSkeleton({ cols = 2, count }: FormGridSkeletonProps) {
  return (
    <FormGrid cols={cols}>
      {Array.from({ length: count ?? cols * 2 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </FormGrid>
  );
}
