'use client';

import { useCallback, useRef, useState, type PointerEvent, type RefObject } from 'react';

const PAN_IGNORE_SELECTOR =
  '[aria-roledescription="draggable"], [data-no-pan], button, a, input, textarea, select, [role="menuitem"], [role="menu"], [role="dialog"]';

interface UseDragScrollOptions {
  scrollRef: RefObject<HTMLDivElement | null>;
  enabled?: boolean;
}

interface UseDragScrollResult {
  isPanning: boolean;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
}

export const useDragScroll = ({ scrollRef, enabled = true }: UseDragScrollOptions): UseDragScrollResult => {
  const [isPanning, setIsPanning] = useState(false);

  const active = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!enabled) {
        return;
      }

      if (event.pointerType !== 'mouse') {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      const target = event.target as HTMLElement;

      if (target.closest(PAN_IGNORE_SELECTOR)) {
        return;
      }

      const el = scrollRef.current;

      if (!el) {
        return;
      }

      active.current = true;
      startX.current = event.clientX;
      startScrollLeft.current = el.scrollLeft;
      el.setPointerCapture(event.pointerId);
      setIsPanning(true);
    },
    [enabled, scrollRef]
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!active.current) {
        return;
      }

      const el = scrollRef.current;

      if (!el) {
        return;
      }

      el.scrollLeft = startScrollLeft.current - (event.clientX - startX.current);
    },
    [scrollRef]
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!active.current) {
        return;
      }

      active.current = false;

      const el = scrollRef.current;

      if (el && el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId);
      }

      setIsPanning(false);
    },
    [scrollRef]
  );

  return { isPanning, onPointerDown, onPointerMove, onPointerUp };
};
