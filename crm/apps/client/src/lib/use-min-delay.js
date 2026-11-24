import React from "react";

export function useMinDelay(active, delayMs = 1000) {
  const [visible, setVisible] = React.useState(active);
  const startRef = React.useRef(0);
  const timeoutRef = React.useRef(null);

  React.useEffect(() => {
    if (active) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      startRef.current = Date.now();
      setVisible(true);
      return;
    }

    const elapsed = Date.now() - startRef.current;
    const remaining = Math.max(delayMs - elapsed, 0);
    if (remaining === 0) {
      setVisible(false);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setVisible(false);
    }, remaining);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [active, delayMs]);

  return visible;
}
