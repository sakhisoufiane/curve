import { Skeleton } from '../../components/skeleton';

export function TerritoriesPickerSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-9 w-full" />
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-md" />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-4 rounded-sm" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
