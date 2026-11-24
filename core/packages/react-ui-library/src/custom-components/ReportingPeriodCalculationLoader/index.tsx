import { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepIndicator } from './StepIndicator';
import { formatElapsed, useElapsedSeconds } from './utils';
import type { StepState } from './utils';

export interface ReportingPeriodCalculationLoaderProps {
  /**
   * Ordered list of stage labels to render. The consumer owns this list — add or
   * remove stages (e.g. 'Creating Payee Balances' behind a feature flag) as needed.
   */
  stages: readonly string[];
  /**
   * The current status reported by the backend. Matched case-insensitively
   * against `stages` (the active step) and, when provided, `errorStages` (a
   * failed step). When it matches neither, all steps show as pending.
   */
  calculationStatus?: string;
  /**
   * Optional error labels parallel to `stages` — index `i` is the status reported
   * when stage `i` fails. When `calculationStatus` matches one of these, that stage
   * renders as errored and the header switches to a failed state.
   */
  errorStages?: readonly string[];
  /** Heading shown above the stepper, e.g. "Calculating period" or "Generating statement". */
  title: string;
  /**
   * ISO datetime string for when the process started.
   * Displayed below the heading if provided.
   */
  processStartTime?: string;
  /**
   * Number of items processed so far.
   * Used to render a progress bar when `totalContractsForCalculation` is also set.
   */
  completedCatalogueItems?: number;
  /**
   * Total items to process in this run.
   * Progress bar is hidden when this is 0 or undefined.
   */
  totalContractsForCalculation?: number;
  /** Label shown above the progress bar. Defaults to "Processed". */
  progressLabel?: string;
  className?: string;
}

export function ReportingPeriodCalculationLoader({
  stages,
  calculationStatus,
  errorStages,
  title,
  processStartTime,
  completedCatalogueItems = 0,
  totalContractsForCalculation = 0,
  progressLabel = 'Processed',
  className,
}: ReportingPeriodCalculationLoaderProps) {
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const progressPct =
    totalContractsForCalculation > 0
      ? Math.min(100, Math.round((completedCatalogueItems / totalContractsForCalculation) * 100))
      : 0;

  const elapsedSeconds = useElapsedSeconds(processStartTime);

  const formattedStartTime = processStartTime
    ? new Date(processStartTime).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : undefined;

  const matchStatus = (list: readonly string[]) =>
    calculationStatus != null ? list.findIndex((s) => s.toLowerCase() === calculationStatus.toLowerCase()) : -1;

  const activeIdx = matchStatus(stages);
  const erroredIdx = errorStages ? matchStatus(errorStages) : -1;
  const isErrored = erroredIdx >= 0;

  // A failed stage occupies the same slot the active stage otherwise would.
  const currentIdx = isErrored ? erroredIdx : activeIdx;

  const completedCount = currentIdx > 0 ? currentIdx : 0;

  const isCollapsed = completedCount >= 2 && !completedExpanded;

  type StageItem = { kind: 'stage'; stage: string; state: StepState };
  type SummaryItem = { kind: 'summary'; count: number };
  type RenderItem = StageItem | SummaryItem;

  const items: RenderItem[] = [];

  if (isCollapsed) {
    items.push({ kind: 'summary', count: completedCount });
  } else {
    for (let i = 0; i < completedCount; i++) {
      items.push({ kind: 'stage', stage: stages[i]!, state: 'completed' });
    }
  }

  for (let i = currentIdx === -1 ? 0 : currentIdx; i < stages.length; i++) {
    const stage = stages[i]!;
    const state: StepState = i === currentIdx ? (isErrored ? 'errored' : 'active') : 'pending';
    items.push({ kind: 'stage', stage, state });
  }

  return (
    <div className={cn('max-w-sm mx-auto py-4 space-y-8', className)}>
      {/* Header */}
      <div className="text-center space-y-3">
        <div
          className={cn(
            'inline-flex items-center justify-center size-14 rounded-full mx-auto',
            isErrored ? 'bg-red-500/10' : 'bg-primary/10'
          )}
        >
          {isErrored ? (
            <AlertTriangle className="size-7 text-red-500" />
          ) : (
            <Loader2 className="size-7 animate-spin text-primary" />
          )}
        </div>
        <div>
          <p className="font-semibold text-lg">{title}</p>
          {formattedStartTime && <p className="text-sm text-muted-foreground mt-0.5">Started {formattedStartTime}</p>}
          {elapsedSeconds !== null && (
            <p className="text-xs text-muted-foreground/70 mt-0.5 tabular-nums">
              Elapsed: <span className="font-medium text-muted-foreground">{formatElapsed(elapsedSeconds)}</span>
            </p>
          )}
        </div>

        {/* Contracts progress bar */}
        {totalContractsForCalculation > 0 && (
          <div className="space-y-1.5 text-left pt-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progressLabel}</span>
              <span className="tabular-nums">
                {completedCatalogueItems.toLocaleString()} / {totalContractsForCalculation.toLocaleString()}
                <span className="ml-1.5 text-foreground font-medium">{progressPct}%</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stages stepper */}
      <div>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;

          if (item.kind === 'summary') {
            return (
              <div key="__summary" className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <div className="size-7 rounded-full border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                    <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                  </div>
                  {!isLast && <div className="w-px flex-1 mt-1 mb-1 min-h-4 bg-emerald-400" />}
                </div>
                <div className="pb-5 pt-0.5 flex-1 flex items-center justify-between min-w-0">
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {item.count} steps complete
                  </p>
                  <button
                    onClick={() => setCompletedExpanded(true)}
                    className="ml-3 shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Show
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          }

          const { stage, state } = item;
          const isLastCompleted =
            !isCollapsed && state === 'completed' && completedCount >= 2 && i === completedCount - 1;
          const connectorColor = state === 'completed' ? 'bg-emerald-400' : 'bg-border';

          return (
            <div key={stage} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <StepIndicator state={state} />
                {!isLast && (
                  <div className={cn('w-px flex-1 mt-1 mb-1 min-h-4 transition-colors duration-300', connectorColor)} />
                )}
              </div>
              <div className={cn('pb-5 pt-0.5 flex-1 min-w-0', isLast && 'pb-0')}>
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      'text-sm transition-colors duration-200',
                      state === 'completed' && 'text-muted-foreground line-through decoration-muted-foreground/40',
                      state === 'active' && 'text-foreground font-semibold',
                      state === 'errored' && 'text-red-600 dark:text-red-400 font-semibold',
                      state === 'pending' && 'text-muted-foreground/60'
                    )}
                  >
                    {stage}
                    {state === 'active' && (
                      <span className="ml-2 inline-flex items-center text-xs font-normal text-primary bg-primary/8 rounded-full px-2 py-0.5">
                        In progress
                      </span>
                    )}
                    {state === 'errored' && (
                      <span className="ml-2 inline-flex items-center text-xs font-normal text-red-600 dark:text-red-400 bg-red-500/10 rounded-full px-2 py-0.5">
                        Failed
                      </span>
                    )}
                  </p>
                  {isLastCompleted && (
                    <button
                      onClick={() => setCompletedExpanded(false)}
                      className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Hide
                      <ChevronUp className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
