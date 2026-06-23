'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { cn } from '@workspace/ui/lib/utils';

export interface VariableSuggestionItem {
  token: string;
  label: string;
  namespace: string;
}

export interface VariableSuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface VariableSuggestionListProps {
  items: VariableSuggestionItem[];
  command: (item: VariableSuggestionItem) => void;
}

export const VariableSuggestionList = forwardRef<VariableSuggestionListRef, VariableSuggestionListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Keep a stable ref so the click handler always calls the latest command,
  // even if the Suggestion plugin tears down props between pointerdown and click.
  const commandRef = useRef(command);
  commandRef.current = command;

  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (items.length === 0) return false;

      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + items.length - 1) % items.length);
        return true;
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % items.length);
        return true;
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        const item = items[selectedIndex];
        if (item) commandRef.current(item);
        return true;
      }

      return false;
    },
  }));

  return (
    <div
      data-variable-suggestion
      className="z-[60] max-h-72 w-72 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      // Prevent ALL pointer/mouse events from moving focus out of the editor.
      // This stops the Suggestion plugin's blur-based onExit from firing before
      // the click handler runs.
      onPointerDown={e => e.preventDefault()}
      onMouseDown={e => e.preventDefault()}>
      {items.length === 0 ? (
        <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhuma variável encontrada</div>
      ) : (
        items.map((item, index) => (
          <button
            key={item.token}
            type="button"
            data-selected={index === selectedIndex}
            className={cn(
              'flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left text-sm cursor-pointer',
              index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
            )}
            onClick={() => commandRef.current(item)}
            onMouseEnter={() => setSelectedIndex(index)}>
            <span className="font-medium">{item.label}</span>
            <span className="proposal-variable-token text-[10px]">{`{{${item.token}}}`}</span>
          </button>
        ))
      )}
    </div>
  );
});

VariableSuggestionList.displayName = 'VariableSuggestionList';
