'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  List,
  ListOrdered,
  Table as TableIcon,
  Rows3,
  Columns3,
  Trash2,
  Braces,
} from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import { Separator } from '@workspace/ui/components/separator';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@workspace/ui/components/dropdown-menu';

import { VARIABLE_GROUPS } from '@/lib/proposals/variables';
import { VariableNode } from './variable-node';
import { VariableSuggestion } from './variable-suggestion';
import './proposal-document.css';

interface TemplateEditorProps {
  /** Initial HTML. To load a different source after mount, change the component `key`. */
  content: string;
  onChange?: (html: string) => void;
  editable?: boolean;
}

const EXTENSIONS = [
  StarterKit,
  Underline,
  Placeholder.configure({ placeholder: 'Escreva o conteúdo do modelo…' }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  VariableNode,
  VariableSuggestion,
];

const ToolbarButton = ({ active, title, onClick, children }: { active?: boolean; title: string; onClick: () => void; children: React.ReactNode }) => (
  <Button type="button" size="icon" variant={active ? 'secondary' : 'ghost'} className="h-8 w-8" title={title} onClick={onClick}>
    {children}
  </Button>
);

const Toolbar = ({ editor }: { editor: Editor }) => {
  const insertVariable = (token: string) => {
    editor.chain().focus().insertContent({ type: 'variable', attrs: { token } }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-1.5">
      <ToolbarButton title="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Sublinhado" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton
        title="Título"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Lista" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton title="Inserir tabela" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()}>
        <TableIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Adicionar linha" onClick={() => editor.chain().focus().addRowAfter().run()}>
        <Rows3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Adicionar coluna" onClick={() => editor.chain().focus().addColumnAfter().run()}>
        <Columns3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Remover tabela" onClick={() => editor.chain().focus().deleteTable().run()}>
        <Trash2 className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" variant="outline" className="h-8">
            <Braces className="mr-1 h-4 w-4" />
            Inserir variável
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Variáveis disponíveis</DropdownMenuLabel>
          {VARIABLE_GROUPS.map(group => (
            <DropdownMenuSub key={group.namespace}>
              <DropdownMenuSubTrigger>{group.label}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                {group.variables.map(variable => (
                  <DropdownMenuItem key={variable.token} className="proposal-variable-menu-item" onSelect={() => insertVariable(variable.token)}>
                    <span className="flex flex-col">
                      <span className="text-sm">{variable.label}</span>
                      <span className="proposal-variable-token text-[10px]">{`{{${variable.token}}}`}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const TemplateEditor = ({ content, onChange, editable = true }: TemplateEditorProps) => {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'proposal-document focus:outline-none px-4 py-3' },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  if (!editor) return null;

  return (
    <div className="proposal-editor overflow-hidden rounded-md border">
      {editable && <Toolbar editor={editor} />}
      <div className="max-h-[55vh] overflow-y-auto bg-white dark:bg-background">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default TemplateEditor;
