import { Extension } from '@tiptap/core';
import Suggestion, { type SuggestionProps, type SuggestionKeyDownProps } from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';

import { normalize } from '@workspace/utils/text';
import { VARIABLE_GROUPS } from '@/lib/proposals/variables';

import { VariableSuggestionList, type VariableSuggestionItem, type VariableSuggestionListRef } from './variable-suggestion-list';

const ALL_ITEMS: VariableSuggestionItem[] = VARIABLE_GROUPS.flatMap(group =>
  group.variables.map(variable => ({ token: variable.token, label: variable.label, namespace: group.namespace }))
);

const filterItems = (query: string): VariableSuggestionItem[] => {
  const q = normalize(query).toLowerCase().trim();
  const matches = !q ? ALL_ITEMS : ALL_ITEMS.filter(item => normalize(item.label).toLowerCase().includes(q) || item.token.toLowerCase().includes(q));

  return matches.slice(0, 8);
};

export const VariableSuggestion = Extension.create({
  name: 'variableSuggestion',

  addProseMirrorPlugins() {
    return [
      Suggestion<VariableSuggestionItem, VariableSuggestionItem>({
        editor: this.editor,
        char: '{{',
        startOfLine: false,
        allowSpaces: false,
        items: ({ query }) => filterItems(query),
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, { type: 'variable', attrs: { token: props.token } })
            .insertContent(' ')
            .run();
        },
        render: () => {
          let component: ReactRenderer<VariableSuggestionListRef> | null = null;
          let popup: TippyInstance[] | null = null;

          const buildProps = (props: SuggestionProps<VariableSuggestionItem, VariableSuggestionItem>) => ({
            items: props.items,
            command: (item: VariableSuggestionItem) => props.command(item),
          });

          return {
            onStart: (props: SuggestionProps<VariableSuggestionItem, VariableSuggestionItem>) => {
              component = new ReactRenderer(VariableSuggestionList, {
                props: buildProps(props),
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },

            onUpdate: (props: SuggestionProps<VariableSuggestionItem, VariableSuggestionItem>) => {
              component?.updateProps(buildProps(props));
              if (props.clientRect) {
                popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect });
              }
            },

            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide();
                // Prevent the surrounding Radix Dialog from closing on Escape.
                props.event.stopPropagation();
                return true;
              }
              return component?.ref?.onKeyDown(props) ?? false;
            },

            onExit: () => {
              popup?.[0]?.destroy();
              component?.destroy();
              popup = null;
              component = null;
            },
          };
        },
      }),
    ];
  },
});

export default VariableSuggestion;
