'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

interface UseScrollProgressOptions {
  scrollRef: RefObject<HTMLDivElement | null>;
}

interface UseScrollProgressResult {
  progress: number;
  isOverflowing: boolean;
  onScroll: () => void;
  recompute: () => void;
}

export const useScrollProgress = ({ scrollRef }: UseScrollProgressOptions): UseScrollProgressResult => {
  const [progress, setProgress] = useState(0);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const lastProgress = useRef(0);
  const lastOverflowing = useRef(false);

  const recompute = useCallback(() => {
    const el = scrollRef.current;

    if (!el) {
      return;
    }

    const max = el.scrollWidth - el.clientWidth;
    const overflowing = max > 1;
    const ratio = max > 0 ? el.scrollLeft / max : 0;
    const next = Math.min(1, Math.max(0, ratio));

    if (overflowing !== lastOverflowing.current) {
      lastOverflowing.current = overflowing;
      setIsOverflowing(overflowing);
    }

    if (next !== lastProgress.current) {
      lastProgress.current = next;
      setProgress(next);
    }
  }, [scrollRef]);

  const onScroll = useCallback(() => {
    recompute();
  }, [recompute]);

  useEffect(() => {
    const el = scrollRef.current;

    if (!el) {
      return;
    }

    const observer = new ResizeObserver(() => recompute());
    observer.observe(el);
    window.addEventListener('resize', recompute);
    recompute();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [scrollRef, recompute]);

  return { progress, isOverflowing, onScroll, recompute };
};
