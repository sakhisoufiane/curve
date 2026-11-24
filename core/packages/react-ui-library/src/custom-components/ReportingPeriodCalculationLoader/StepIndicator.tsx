import { Check, Loader2, X } from 'lucide-react';
import type { StepState } from './utils';

export function StepIndicator({ state }: { state: StepState }) {
  if (state === 'completed') {
    return (
      <div className="size-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
        <Check className="size-3.5 text-white stroke-[2.5]" />
      </div>
    );
  }
  if (state === 'errored') {
    return (
      <div className="size-7 rounded-full bg-red-500 flex items-center justify-center shrink-0 shadow-sm ring-4 ring-red-500/15">
        <X className="size-3.5 text-white stroke-[2.5]" />
      </div>
    );
  }
  if (state === 'active') {
    return (
      <div className="size-7 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm ring-4 ring-primary/15">
        <Loader2 className="size-3.5 text-primary-foreground animate-spin" />
      </div>
    );
  }
  return <div className="size-7 rounded-full border-2 border-border bg-background shrink-0" />;
}
