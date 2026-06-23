import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Inline atomic Tiptap node that represents a template variable.
 *
 * It renders as <span data-variable="TOKEN">{{TOKEN}}</span>, so:
 *  - the editor shows it as a single, non-editable "chip";
 *  - the stored HTML keeps the literal {{TOKEN}} text, which the resolver
 *    (a {{...}} regex) replaces with real data when generating the document.
 */
export interface VariableNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const VariableNode = Node.create<VariableNodeOptions>({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      token: {
        default: null,
        parseHTML: element => element.getAttribute('data-variable'),
        renderHTML: attributes => (attributes.token ? { 'data-variable': attributes.token } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-variable]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'proposal-var' }),
      `{{${node.attrs.token}}}`,
    ];
  },

  renderText({ node }) {
    return `{{${node.attrs.token}}}`;
  },
});

export default VariableNode;
