import { useEffect, useRef } from "react";

export function usePolling(
  callback: () => Promise<void> | void,
  interval: number,
  enabled: boolean
) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        await savedCallback.current();
      } finally {
        if (!cancelled) {
          timerId = setTimeout(tick, interval);
        }
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [interval, enabled]);
}
