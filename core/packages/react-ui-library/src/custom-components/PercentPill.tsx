import React from 'react';
import { Check } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '../lib/utils';

type PercentVariant = 'full' | 'empty' | 'partial';
export type PercentIndicator = 'dot' | 'arc' | 'bar' | 'text' | 'filled' | 'semantic' | 'underline' | 'plain';

function getVariant(value: number): PercentVariant {
  if (value >= 100) return 'full';
  if (value <= 0) return 'empty';
  return 'partial';
}

function formatValue(value: number): string {
  return `${parseFloat(value.toFixed(2))}`;
}

// ── Shared colour maps ────────────────────────────────────────────────────────

const textColor: Record<PercentVariant, string> = {
  full: 'text-emerald-700 dark:text-emerald-400',
  partial: 'text-amber-700 dark:text-amber-400',
  empty: 'text-red-700 dark:text-red-400',
};

const bgLight: Record<PercentVariant, string> = {
  full: 'bg-emerald-50 dark:bg-emerald-950/40',
  partial: 'bg-amber-50 dark:bg-amber-950/40',
  empty: 'bg-red-50 dark:bg-red-950/40',
};

const solidColor: Record<PercentVariant, string> = {
  full: 'bg-emerald-500',
  partial: 'bg-amber-400',
  empty: 'bg-red-500',
};

// ── Standard pill shell ───────────────────────────────────────────────────────

const pillBase = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        full: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
        partial: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
        empty: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400',
      },
    },
  }
);

// ── Indicators ────────────────────────────────────────────────────────────────

function DotIndicator({ variant }: { variant: PercentVariant }) {
  return <span className={cn('size-1.5 rounded-full shrink-0', solidColor[variant])} />;
}

function ArcIndicator({ value, variant }: { value: number; variant: PercentVariant }) {
  const r = 4.5;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, value)) / 100);
  const track: Record<PercentVariant, string> = {
    full: 'stroke-emerald-200 dark:stroke-emerald-900',
    partial: 'stroke-amber-200 dark:stroke-amber-900',
    empty: 'stroke-red-200 dark:stroke-red-900',
  };
  const fill: Record<PercentVariant, string> = {
    full: 'stroke-emerald-500 dark:stroke-emerald-400',
    partial: 'stroke-amber-400 dark:stroke-amber-500',
    empty: 'stroke-red-500 dark:stroke-red-400',
  };
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="-rotate-90 shrink-0">
      <circle cx="6" cy="6" r={r} fill="none" strokeWidth="2" className={track[variant]} />
      <circle
        cx="6"
        cy="6"
        r={r}
        fill="none"
        strokeWidth="2"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={fill[variant]}
      />
    </svg>
  );
}

function BarIndicator({ value, variant }: { value: number; variant: PercentVariant }) {
  const track: Record<PercentVariant, string> = {
    full: 'bg-emerald-100 dark:bg-emerald-950/60',
    partial: 'bg-amber-100 dark:bg-amber-950/60',
    empty: 'bg-red-100 dark:bg-red-950/60',
  };
  return (
    <span className={cn('w-8 h-1.5 rounded-full overflow-hidden shrink-0', track[variant])}>
      <span
        className={cn('h-full rounded-full block', solidColor[variant])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </span>
  );
}

// ── New variants ──────────────────────────────────────────────────────────────

function TextPill({ value, variant, className }: { value: number; variant: PercentVariant; className?: string }) {
  return (
    <span className={cn('text-xs font-semibold tabular-nums', textColor[variant], className)}>
      {formatValue(value)}
    </span>
  );
}

function FilledPill({ value, variant, className }: { value: number; variant: PercentVariant; className?: string }) {
  const fillBg: Record<PercentVariant, string> = {
    full: 'bg-emerald-200/70 dark:bg-emerald-700/40',
    partial: 'bg-amber-200/70 dark:bg-amber-700/40',
    empty: 'bg-red-200/70 dark:bg-red-700/40',
  };
  return (
    <span
      className={cn(
        'relative inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap overflow-hidden',
        bgLight[variant],
        className
      )}
    >
      <span
        className={cn('absolute inset-y-0 left-0', fillBg[variant])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
      <span className={cn('relative tabular-nums', textColor[variant])}>{formatValue(value)}</span>
    </span>
  );
}

function SemanticPill({ value, variant, className }: { value: number; variant: PercentVariant; className?: string }) {
  if (variant === 'full') {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center size-5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
          className
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }
  if (variant === 'empty') {
    return <span className={cn('text-sm text-muted-foreground', className)}>—</span>;
  }
  return (
    <span className={cn(pillBase({ variant }), className)}>
      <span className="tabular-nums">{formatValue(value)}</span>
    </span>
  );
}

function UnderlinePill({ value, variant, className }: { value: number; variant: PercentVariant; className?: string }) {
  return (
    <span className={cn('inline-flex flex-col items-center gap-0.5', className)}>
      <span className="text-xs font-medium tabular-nums">{formatValue(value)}</span>
      <span className={cn('w-full h-0.5 rounded-full', solidColor[variant])} />
    </span>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export interface PercentPillProps {
  value: number;
  indicator?: PercentIndicator;
  className?: string;
}

function PercentPill({ value, indicator = 'dot', className }: PercentPillProps) {
  const variant = getVariant(value);

  if (indicator === 'text') return <TextPill value={value} variant={variant} className={className} />;
  if (indicator === 'filled') return <FilledPill value={value} variant={variant} className={className} />;
  if (indicator === 'semantic') return <SemanticPill value={value} variant={variant} className={className} />;
  if (indicator === 'underline') return <UnderlinePill value={value} variant={variant} className={className} />;
  if (indicator === 'plain')
    return (
      <span className={cn(pillBase({ variant }), 'justify-center w-12', className)}>
        <span className="tabular-nums">{formatValue(value)}</span>
      </span>
    );

  return (
    <span className={cn(pillBase({ variant }), className)}>
      {indicator === 'dot' && <DotIndicator variant={variant} />}
      {indicator === 'arc' && <ArcIndicator value={value} variant={variant} />}
      {indicator === 'bar' && <BarIndicator value={value} variant={variant} />}
      <span className="tabular-nums">{formatValue(value)}</span>
    </span>
  );
}

export { PercentPill };
