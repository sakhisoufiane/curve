import { useEffect } from 'react';

type Options = {
  enabled?: boolean;
};

export const useHotkey = (key: string, callback: () => void, options: Options = {}) => {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as Element)?.tagName;
      if (e.key === key && !['INPUT', 'TEXTAREA'].includes(tag)) {
        e.preventDefault();
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, enabled]);
};
