# Especificação de Padrões, Arquitetura e Melhores Práticas

**Versão**: 1.0  
**Última atualização**: 2026-01-21  
**Objetivo**: Documentar padrões estabelecidos, decisões técnicas e melhores práticas para guiar desenvolvimento consistente e manutenível.

---

## 📋 Sumário

1. [Visão Geral](#visão-geral)
2. [Convenções de Nomenclatura](#convenções-de-nomenclatura)
3. [Estilo de Código](#estilo-de-código)
4. [Padrões de Arquitetura](#padrões-de-arquitetura)
5. [TypeScript](#typescript)
6. [Estrutura de Arquivos](#estrutura-de-arquivos)
7. [UI e Styling](#ui-e-styling)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)
10. [Tooling e Configuração](#tooling-e-configuração)
11. [Padrões de Dados](#padrões-de-dados)
12. [Checklist de Code Review](#checklist-de-code-review)

---

## Visão Geral

**Stack Tecnológico:**

- **Frontend**: Next.js 16, React 19, TypeScript 5.7
- **UI**: Radix UI + shadcn/ui
- **Styling**: TailwindCSS 4.0
- **Backend**: Node.js com server actions
- **Database**: PostgreSQL + Drizzle ORM
- **Build**: Turborepo + pnpm
- **Monorepo**: apps (webapp), packages (ui, db, utils, eslint-config, typescript-config)
- **Code Quality**: ESLint 9, Prettier 3.5, TypeScript strict mode
- **Idioma**: Português (PT-BR) para UI, English para código

**Princípios Fundamentais:**

- Clean Code: legibilidade > brevidade
- DRY (Don't Repeat Yourself): reutilizar código comprovado
- Type Safety: TypeScript strict mode sempre
- Maintainability First: espaçamento, nomes descritivos, guard clauses
- Performance: batch queries, memoization, lazy loading

---

## Convenções de Nomenclatura

### Variáveis e Funções

**camelCase** para todo código JavaScript/TypeScript:

```ts
// ✅ Correto
const leadId = '123';
const handleStepChange = (newStep: string) => { ... };
const fetchTaskData = async () => { ... };

// ❌ Errado
const lead_id = '123';
const handle_step_change = () => { ... };
```

### Constantes

**UPPER_CASE** para constantes em nível module/glglhondal:

```ts
// ✅ Correto
const VIEW_STORAGE_KEY = 'leads-view-preference';
const WORKSPACE_REQUIRED_ERROR = 'Workspace é obrigatório';
const VIRTUAL_STEP_MAP: Record<string, any> = { ... };

// ❌ Errado
const viewStorageKey = 'leads-view-preference';
const VIEW_STORAGE_KEY_NAME = '...';
```

### Campos de Database

**snake_case** para nomes de colunas e respostas da API:

```ts
// ✅ Database schema
due_date: timestamp,
completed_at: timestamp,
assignee_id: varchar,
loss_reason: text,

// ✅ Resposta do backend
{ due_date: '2026-01-21', completed_at: null }

// ❌ Errado
dueDate: timestamp,
completedAt: timestamp,
```

### Componentes e Tipos

**PascalCase** para componentes React:

```ts
// ✅ Correto
export const LeadsFilterBar = () => { ... };
export const KanbanCard = ({ lead }) => { ... };
interface LeadTasksSectionProps { ... }

// ❌ Errado
export const leadsFilterBar = () => { ... };
const leadTasksSectionProps = { ... };
```

### Arquivos e Diretórios

**kebab-case** para nomes de arquivos e diretórios:

```
✅ leads-filter-bar.tsx
✅ use-search-params.tsx
✅ task-status.ts
✅ lead-tasks-section.tsx

❌ LeadsFilterBar.tsx
❌ UseSearchParams.tsx
```

### Hooks

**use-** prefix em kebab-case:

```ts
// ✅ Correto
// File: use-search-params.tsx
export const useSearchParams = () => { ... };

// File: use-server-pagination-table.tsx
export const useServerPaginationTable = () => { ... };

// ❌ Errado
// searchParams.ts
// serverPaginationTable.ts
```

---

## Estilo de Código

### Formatting

**Indentação**: 2 espaços (configurado no Prettier)

**Tamanho de linha**: Máximo 150 caracteres (`.prettierrc`)

**Exemplo de multi-line formatting:**

```ts
// ✅ Correto
const TASK_ALERT_FILTERS: FilterChip[] = [
  {
    value: 'overdue',
    label: 'Vencidas',
    dotClass: 'bg-red-500',
    activeClass: 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 hover:text-red-700',
  },
  {
    value: 'near',
    label: 'Vence hoje',
    dotClass: 'bg-amber-500',
    activeClass: 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-700',
  },
];

// ❌ Errado
const TASK_ALERT_FILTERS = [{ value: 'overdue', label: 'Vencidas', dotClass: 'bg-red-500', activeClass: '...' }];
```

### Espaçamento no Código

**Linhas em branco**: Use para separar blocos lógicos dentro de funções:

```ts
// ✅ Correto - clara separação de lógica
const handleSubmit = async () => {
  // Validação
  if (!formData.title.trim()) return;

  // Preparação
  const payload = {
    title: formData.title.trim(),
    description: formData.description,
  };

  // Execução
  const result = await createTask(payload);

  // Feedback
  if (result.success) {
    toast.success('Tarefa criada');
  }
};

// ❌ Errado - tudo junto, difícil de ler
const handleSubmit = async () => {
  if (!formData.title.trim()) return;
  const payload = { title: formData.title.trim(), description: formData.description };
  const result = await createTask(payload);
  if (result.success) {
    toast.success('Tarefa criada');
  }
};
```

### If/Else Blocks

**Multi-line preferred**, nunca ternary no nível superior:

```ts
// ✅ Correto
if (status === 'overdue') {
  return 'Tarefa vencida';
}

if (status === 'due-today') {
  return 'Tarefa vence hoje';
}

return 'Tarefa futura';

// ✅ Correto - guard clause
if (!lead?.lead?.id) {
  return null;
}

// ✅ Correto - ternary apenas em JSX/expressões
<span className={isActive ? 'font-bold' : 'font-normal'}>
  {label}
</span>

// ❌ Errado - if em 1 linha
if (!user) return { error: 'Not authenticated' };
status === 'overdue' ? 'Vencida' : 'Em dia';
```

### Comentários

**Minimal inline comments** — o código deve ser auto-explicativo. Só houver comentário se de fato houver grande necessidade de análise do programador naquele trecho:

```ts
// ✅ Bom - nome descritivo elimina necessidade de comentário
const isTaskOverdue = task.due_date < today;

// ❌ Ruim - comentário redundante
const statusValue = task.status; // get the task status

// ❌ Ruim - comentário desatualizado
// TODO: remover isto em 2025
```

### Arrow Functions

**Sempre use arrow functions** para declarações de funções:

```ts
// ✅ Correto
export const getStatusLabel = (status: string): string => {
  // ...
};

const handleClick = (): void => {
  // ...
};

// ❌ Errado
export function getStatusLabel(status: string): string {
  // ...
}

function handleClick() {
  // ...
}
```

---

## Padrões de Arquitetura

### Server Actions

**Localização**: `apps/webapp/actions/[entity].ts`

**Estrutura padrão**:

```ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getMe } from './users';
import { LeadRepository } from '@/repositories/LeadRepository';

// 1. Definir schema de validação
const UpdateLeadSchema = z.object({
  name: z.string().min(1, 'Nome inválido').optional(),
  email: z.string().email('E-mail inválido').optional(),
});

type UpdateLeadParams = z.infer<typeof UpdateLeadSchema>;

// 2. Implementar action com autenticação e validação
export async function updateLeadInfo(id: string, data: UpdateLeadParams) {
  try {
    // Autenticação
    const me = await getMe();
    if (!me) {
      return { success: false as const, error: 'Usuário não autenticado' };
    }

    // Validação
    const parsed = UpdateLeadSchema.safeParse(data);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';
      return { success: false as const, error: message };
    }

    // Execução
    const updated = await LeadRepository.update(id, parsed.data);

    // Revalidação
    revalidatePath('/leads', 'layout');

    // Resposta
    return { success: true as const, data: updated };
  } catch (error: any) {
    console.error('Error updating lead info:', error);
    return {
      success: false as const,
      error: error?.message || 'Erro ao atualizar informações',
    };
  }
}
```

**Padrão de resposta**:

```ts
// Sucesso
{ success: true as const, data: T }

// Erro
{ success: false as const, error: string }

// Nunca misture:
{ success: true, data: T, error: null }  // ❌ Errado
```

### Repositories

**Localização**: `apps/webapp/repositories/[Entity]Repository.ts`

**Padrão**:

```ts
import { leads_table, tasks_table } from '@workspace/db';
import BaseRepository from '@workspace/db/repositories/BaseRepository';
import { eq, inArray, and, sql } from 'drizzle-orm';

export type GetLeadParams = {
  q?: string;
  page?: number;
  page_size?: number;
  steps?: string[];
  taskAlerts?: string[];
};

export class LeadRepository extends BaseRepository {
  static override model = leads_table;

  static async getLeads(params: GetLeadParams = {}) {
    const {
      q = '',
      page = 1,
      page_size = 10,
      steps,
      taskAlerts,
    } = params;

    // 1. Construir condições
    const conditions: any[] = [isNull(chats_table.done_at)];

    if (q) {
      conditions.push(or(
        ilike(leads_table.name, `%${q}%`),
        ilike(leads_table.email, `%${q}%`)
      ));
    }

    if (steps?.length) {
      conditions.push(inArray(chats_table.step, steps));
    }

    if (taskAlerts?.length) {
      // Construir EXISTS subqueries
      const alertConditions: any[] = [];
      if (taskAlerts.includes('overdue')) {
        alertConditions.push(sql`EXISTS (...)`);
      }
      if (alertConditions.length) {
        conditions.push(or(...alertConditions));
      }
    }

    const where = and(...conditions);

    // 2. Query de dados
    const data = await this.db.selectDistinct({ ... })
      .from(leads_table)
      .where(where)
      .limit(page_size)
      .offset((page - 1) * page_size);

    // 3. Query de contagem (com mesmos filtros)
    const countResult = await this.db
      .selectDistinct({ value: count(leads_table.id) })
      .from(leads_table)
      .where(where);

    // 4. Enriquecer com dados relacionados (batch, não N+1)
    const enriched = await enrichWithRelatedData(data);

    return {
      count: countResult[0]?.value || 0,
      data: enriched,
    };
  }
}
```

**Boas práticas:**

- ✅ Batch queries para dados relacionados (não N+1)
- ✅ Filtros aplicados em ambas as queries (data + count)
- ✅ Condições construídas em array e combinadas com `and()`
- ✅ Tipos exportados para reuso

### Components

**Localização**: `apps/webapp/components/[feature]/[ComponentName].tsx`

**Estrutura**:

```tsx
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';
import { useSearchParams } from '@/hooks/use-search-params';

// 1. Tipos
interface FilterChip {
  value: string;
  label: string;
  dotClass: string;
}

interface LeadsFilterBarProps {
  onFilterChange?: (filters: Record<string, any>) => void;
}

// 2. Constantes e dados estáticos
const TASK_ALERT_FILTERS: FilterChip[] = [
  { value: 'overdue', label: 'Vencidas', dotClass: 'bg-red-500' },
  { value: 'near', label: 'Vence hoje', dotClass: 'bg-amber-500' },
];

// 3. Componente
export const LeadsFilterBar = ({ onFilterChange }: LeadsFilterBarProps) => {
  const { params, setParams } = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // 4. Handlers
  const handleFilterToggle = useCallback(
    (value: string) => {
      setParams({ taskAlerts: value });
      onFilterChange?.({ taskAlerts: value });
    },
    [setParams, onFilterChange]
  );

  // 5. Render com guard clauses
  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="flex gap-2">
      {TASK_ALERT_FILTERS.map(chip => (
        <button key={chip.value} onClick={() => handleFilterToggle(chip.value)} className={cn('px-3 py-2 rounded', chip.dotClass)}>
          {chip.label}
        </button>
      ))}
    </div>
  );
};
```

---

## TypeScript

### Tipos e Interfaces

**export type** para tipos públicos:

```ts
// ✅ Correto
export type GetLeadParams = {
  q?: string;
  page?: number;
  page_size?: number;
};

export type TaskStatus = 'future' | 'due-today' | 'overdue' | 'completed';
```

**interface** para props de componentes (local):

```ts
// ✅ Correto
interface LeadTasksSectionProps {
  leadId: string;
}

interface FilterChip {
  value: string;
  label: string;
  dotClass: string;
}

export const LeadsFilterBar = (props: LeadsFilterBarProps) => { ... };
```

### Discriminated Unions

**Para respostas de actions**:

```ts
// ✅ Correto
export async function updateLead(id: string, data: any) {
  try {
    const result = await repository.update(id, data);
    return { success: true as const, data: result };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// Uso:
const result = await updateLead('123', { name: 'João' });
if (result.success) {
  console.log(result.data); // ✅ TypeScript sabe que data existe
} else {
  console.log(result.error); // ✅ TypeScript sabe que error existe
}
```

### Generic Usage

**Minimal generics** — mantenha simples:

```ts
// ✅ Razoável para dados genéricos
type ApiResponse<T> = { success: boolean; data?: T; error?: string };

// ❌ Muito genérico, prefer concreto
type Handler<T, U, V> = (a: T) => (b: U) => V;

// Use concreto em vez disso:
type LeadHandler = (leadId: string) => Promise<Lead>;
```

### Type Narrowing

**Use guard clauses**:

```ts
// ✅ Correto - type narrowing com guard
if (!lead?.lead?.id) {
  return null;
}
// TypeScript sabe que lead.lead.id é string aqui

// ❌ Errado - não narrowing
const leadId = lead?.lead?.id;
if (!leadId) return null;
useEffect(() => {
  // leadId pode ser undefined aqui (TS não narrowed)
}, [leadId]);
```

---

## Estrutura de Arquivos

### Diretórios

```
apps/webapp/
├── actions/              # Server actions (getLeads, updateLeadInfo, createTask)
├── app/                  # Next.js App Router (pages, layouts, api routes)
├── components/
│   ├── commons/          # Componentes compartilhados (PageInset, Providers)
│   ├── leads/            # Lead-specific (kanban/, datatable/, leads-filter-bar.tsx)
│   ├── chats/
│   └── ...
├── contexts/             # React Context
├── hooks/                # Custom hooks (use-search-params, use-server-pagination-table)
├── lib/                  # Utilitários (workspaces, company profile)
├── repositories/         # Data access (LeadRepository, ChatRepository)
├── styles/               # Glglhondal CSS
├── utils/                # Pure functions (status-utils, task-status)
└── uploads/              # Static files

packages/
├── ui/                   # shadcn/ui + componentes customizados
├── db/                   # Drizzle ORM + schema + repositories
├── utils/                # Funções puras de utilidade
├── eslint-config/        # Configuração compartilhada
└── typescript-config/    # TypeScript config compartilhada
```

### Padrão de Exports

**Named exports** para utilitários e componentes:

```ts
// ✅ Correto
export const getStatusLabel = (status: string): string => { ... };
export const getLeadTaskAlert = (tasks: TaskLike[]): LeadTaskAlert | null => { ... };
export const LeadsFilterBar = () => { ... };

export type GetLeadParams = { ... };
export interface FilterChip { ... }

// Default export apenas para page components
export default function LeadsPage() { ... }
```

---

## UI e Styling

### shadcn/ui

**Importar de @workspace/ui**:

```ts
// ✅ Correto
import { Button } from '@workspace/ui/components/button';
import { Toggle } from '@workspace/ui/components/toggle';
import { Tooltip, TooltipTrigger, TooltipContent } from '@workspace/ui/components/tooltip';

// ❌ Errado
import { Button } from 'shadcn-ui/button';
import Button from '@workspace/ui';
```

### Tailwind e `cn()`

**Use `cn()` para conditional classes**:

```tsx
// ✅ Correto
import { cn } from '@workspace/ui/lib/utils';

<div className={cn(
  'px-3 py-2 rounded text-sm',
  isActive && 'bg-blue-500 text-white',
  isDisabled && 'opacity-50 cursor-not-allowed'
)}>
  {label}
</div>

// ❌ Errado - string concatenação
<div className={`px-3 py-2 ${isActive ? 'bg-blue-500' : ''}`}>

// ❌ Errado - ternary complexo
<div className={isActive ? 'px-3 py-2 rounded bg-blue-500' : 'px-3 py-2 rounded bg-gray-100'}>
```

### Cores e Tokens

**Semantic color tokens** prefer-se a raw Tailwind:

```tsx
// ✅ Correto - usar tokens semânticos
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Ação primária
</button>

<div className="text-muted-foreground">Descrição</div>

// ✅ Correto - colors específicas quando faz sentido
<span className="w-2 h-2 rounded-full bg-red-500" />  // Task overdue

// ❌ Errado - raw Tailwind sem semântica
<button className="bg-blue-500 text-white" />
```

---

## Error Handling

### Try-Catch Pattern

**Em server actions e async functions**:

```ts
export async function createTask(params: CreateTaskParams) {
  try {
    // 1. Validar entrada
    const parsed = CreateTaskSchema.safeParse(params);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message };
    }

    // 2. Executar
    const task = await TaskRepository.create(parsed.data);

    // 3. Revalidar se necessário
    revalidatePath('/leads', 'layout');

    return { success: true, data: task };
  } catch (error: any) {
    console.error('Error creating task:', error);
    return {
      success: false,
      error: error?.message || 'Erro ao criar tarefa',
    };
  }
}
```

### Zod Validation

**Sempre validar em server actions**:

```ts
import { z } from 'zod';

const TaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  dueDate: z.string().datetime('Data inválida'),
  description: z.string().optional(),
});

const parsed = TaskSchema.safeParse(data);
if (!parsed.success) {
  const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';
  return { success: false, error: message };
}
```

### Toast Notifications

**Para feedback ao usuário**:

```tsx
import { toast } from 'sonner';

const handleUpdate = async () => {
  try {
    const result = await updateLead(leadId, formData);
    if (result.success) {
      toast.success('Lead atualizado com sucesso');
    } else {
      toast.error(result.error);
    }
  } catch (error) {
    toast.error('Erro inesperado');
  }
};
```

---

## Best Practices

### DRY (Don't Repeat Yourself)

**Reutilizar código comprovado**:

```ts
// ✅ Bom - função compartilhada
const getTaskStatus = (task: TaskLike): TaskStatus => { ... };

// Usado em:
// 1. lead-tasks-section.tsx (painel de tarefas)
// 2. leads-filter-bar.tsx (filtro de alertas)
// 3. kanban/card.tsx (indicador de ponto colorido)

// ❌ Errado - lógica duplicada
// Em cada componente:
const status = task.completed_at ? 'completed' : ...;
```

### Guard Clauses

**Primeiros na função**:

```ts
// ✅ Correto
const handleLeadClick = (lead: Lead) => {
  if (!lead?.lead?.id) {
    console.warn('Invalid lead');
    return;
  }

  if (!lead.chat?.id) {
    console.warn('No chat found');
    return;
  }

  // ... resto da lógica
};

// ❌ Errado - deep nesting
const handleLeadClick = (lead: Lead) => {
  if (lead?.lead?.id) {
    if (lead.chat?.id) {
      // ...
    }
  }
};
```

### Evitar N+1 Queries

**Batch fetching**:

```ts
// ✅ Correto - 1 query para tarefas
const leadIds = leadsData.map(row => row.lead?.id).filter(Boolean);
const taskRows = await this.db
  .select({ lead_id: tasks_table.lead_id, ... })
  .from(tasks_table)
  .where(inArray(tasks_table.lead_id, leadIds));

// ❌ Errado - N queries
for (const lead of leads) {
  const tasks = await TaskRepository.findByLead(lead.id);
}
```

### Memoization

**Para derivações caras**:

```ts
// ✅ Correto
const columns = useMemo(() => createColumns(loadedAt), [loadedAt]);

const visibleSteps = useMemo(() => (stepFilter?.length ? steps.filter(s => stepFilter.includes(s.id)) : steps), [steps, stepFilter]);

// ❌ Errado - recalcula toda render
const columns = createColumns(loadedAt);
const visibleSteps = steps.filter(s => stepFilter?.includes(s.id));
```

### Naming

**Nomes descritivos elimina comentários**:

```ts
// ✅ Bom - nome explícito
const isTaskOverdue = task.dueDate < today;
const hasNewActivity = lastUpdated > loadedAt;

// ❌ Ruim - vago
const isOverdue = task.dueDate < today; // needs context
const has = lastUpdated > loadedAt; // unclear
```

---

## Tooling e Configuração

### TypeScript

**Sempre strict mode** — `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  }
}
```

### ESLint

**Configuração em `@workspace/eslint-config`**:

- ESLint 9 + TypeScript ESLint
- Prettier integration
- Next.js plugin (para webapp)
- React hooks enforcement
- Sem custom naming rules (TypeScript já enforça)

**Executar**:

```bash
pnpm -F webapp exec eslint apps/webapp/components --fix
```

### Prettier

**Configuração em `.prettierrc`**:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 150,
  "trailingComma": "es5",
  "arrowParens": "avoid"
}
```

### Turborepo

**Scripts root `package.json`**:

```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "format": "prettier --write \"**/*.{ts,tsx,md}\""
  }
}
```

### Path Aliases

**Sempre usar aliases** em vez de relative imports:

```ts
// ✅ Correto
import { cn } from '@workspace/ui/lib/utils';
import { getLeads } from '@/actions/leads';
import { useSearchParams } from '@/hooks/use-search-params';
import { LeadRepository } from '@/repositories/LeadRepository';

// ❌ Errado
import { cn } from '../../../../packages/ui/lib/utils';
import { getLeads } from '../actions/leads';
import useSearchParams from '../hooks/use-search-params';
```

---

## Padrões de Dados

### ISO 8601 com Timezone

**Sempre usar timestamps com timezone**:

```ts
// ✅ Correto
const createdAt = new Date().toISOString(); // "2026-01-21T10:30:00.000Z"

// Database
due_date: timestamp('due_date', { withTimezone: true, mode: 'string' });

// Query com timezone awareness
sql`(${tasks_table.due_date} AT TIME ZONE 'America/Fortaleza')::date`;

// ❌ Errado
const createdAt = new Date().getTime();
const dueDate = new Date().toLocaleDateString();
```

### URL Query Parameters

**CSV para arrays, via URL**:

```ts
// ✅ Correto - armazenar como CSV no URL
// URL: ?taskAlerts=overdue,near&steps=qualified,negotiation

const parseCSV = (value: unknown): string[] => {
  if (!value) return [];
  return String(value).split(',').filter(Boolean);
};

const taskAlerts = params.taskAlerts ? parseCSV(params.taskAlerts) : [];
const steps = params.steps ? parseCSV(params.steps) : [];

// Enviar para server
getLeads({ taskAlerts, steps, ... });

// ❌ Errado
// ?taskAlerts[]=overdue&taskAlerts[]=near  (array URL encoding, menos limpo)
// ?filter={"taskAlerts":["overdue"]}  (JSON, ilegível)
```

### Mensagens em Português

**Sempre PT-BR para UI**:

```ts
// ✅ Correto
toast.error('Tarefa não encontrada');
return { success: false, error: 'Usuário não autenticado' };
placeholder: 'Buscar por nome ou e-mail...';

// ❌ Errado
toast.error('Task not found');
error: 'User not authenticated';
```

---

## Checklist de Code Review

### ✅ Antes de fazer commit

- [ ] Nomes descritivos (camelCase para vars, UPPER_CASE para constantes)
- [ ] Sem ifs em 1 linha (multi-line mesmo para simples)
- [ ] Guard clauses no início de funções
- [ ] Sem comentários desnecessários
- [ ] Espaçamento claro entre blocos lógicos
- [ ] Arrow functions com `const`
- [ ] Types exportados quando compartilhados
- [ ] Zod validation em server actions
- [ ] Try-catch com console.error
- [ ] Batch queries, não N+1
- [ ] CN() para classes condicionais
- [ ] Path aliases (@/_, @workspace/_) em vez de relative
- [ ] Português para mensagens de usuário
- [ ] ISO 8601 para timestamps
- [ ] Lint + Prettier: `pnpm format && pnpm lint`
- [ ] TypeScript strict: `pnpm -F webapp exec tsc --noEmit`

### ✅ Ao revisar código

- [ ] Nomenclatura consistente com padrões
- [ ] Código legível (espaçamento, nomes)
- [ ] Sem lógica duplicada (reusa utilitários)
- [ ] Validação de entrada (Zod)
- [ ] Error handling (try-catch + return object)
- [ ] Sem N+1 queries
- [ ] Types corretos (não `any`)
- [ ] Props bem tipadas
- [ ] Componentes compostos corretamente
- [ ] Acessibilidade básica (alt text, roles)

---

## Referências

- **TypeScript Config**: `packages/typescript-config/base.json`
- **ESLint Config**: `packages/eslint-config/`
- **Prettier Config**: `.prettierrc`
- **Turbo Config**: `turbo.json`
- **Docs Internas**: `AGENTS.md`, `.github/copilot-instructions.md`

---

**Última atualização**: 2026-01-21  
**Responsável**: Arquitetura do Projeto  
**Versão**: 1.0 (WIP)
