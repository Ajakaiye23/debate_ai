import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Generic countdown timer with pause/resume. Reused for the get-ready countdown,
 * the speaking turn, and the between-turn break. Call `start(seconds)` to begin;
 * `onExpire` fires once when it reaches zero.
 */
export function useTimer(onExpire: () => void) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const clear = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const start = useCallback((seconds: number) => {
    clear();
    setTimeLeft(seconds);
    setPaused(false);
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    clear();
    setRunning(false);
    setPaused(false);
  }, []);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  useEffect(() => {
    if (!running || paused) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const next = t - 1;
        if (next <= 0) {
          clear();
          setRunning(false);
          onExpireRef.current();
          return 0;
        }
        return next;
      });
    }, 1000);
    return clear;
  }, [running, paused]);

  return { timeLeft, running, paused, start, stop, pause, resume };
}
