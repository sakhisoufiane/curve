import { useEffect, useState } from 'react';

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function useElapsedSeconds(startTime: string | undefined): number | null {
  const [elapsed, setElapsed] = useState<number | null>(() => {
    if (!startTime) return null;
    return Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
  });

  useEffect(() => {
    if (!startTime) return;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return elapsed;
}

export type StepState = 'completed' | 'active' | 'pending' | 'errored';
