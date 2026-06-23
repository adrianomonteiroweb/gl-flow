# CLAUDE.md — Guia único de desenvolvimento do projeto glhonda

Este é o **único** arquivo de instruções para qualquer IA que atue neste repositório. Não consulte nem crie outros arquivos `*.md` de instruções (ex.: `AGENTS.md`, `.github/copilot-instructions.md`, `.claude/CLAUDE.md`). Em caso de conflito com qualquer outro guia, **este documento prevalece**.

Idioma deste documento: pt-BR. Idioma do código: inglês. Idioma da UI/strings: pt-BR.

---

## 1. Stack real

- **Monorepo**: Turborepo 2 + pnpm 10.4.1 + Node >= 20.
- **App principal**: Next 16 (App Router, Turbopack) + React 19 + TypeScript 5.7 (`strict: true`, `noUncheckedIndexedAccess: true`).
- **UI**: shadcn/ui sobre Radix + TailwindCSS v4 (CSS variables em `oklch`) + `lucide-react` + `sonner` + `next-themes`.
- **Forms**: `react-hook-form` + `zod` + `@hookform/resolvers/zod`.
- **Tabelas**: `@tanstack/react-table`.
- **Editor rico**: TipTap.
- **DB**: PostgreSQL via Drizzle ORM 0.45 (cliente `pg`), schema `glhonda`.
- **Auth**: JWT custom em cookie HttpOnly (`glhonda_DOC_AT`), assinado com `TOKEN_KEY`. Senha com `bcryptjs` (fallback `sha1` em upgrade).
- **AWS**: S3, SES, Lambda via `@workspace/utils/aws/*`.
- **Deploy**: AWS Amplify (build via `turbo run build --filter=@apps/webapp`) e Vercel (somente cron endpoints).

Versões reais estão em [package.json](package.json), [apps/webapp/package.json](apps/webapp/package.json), [turbo.json](turbo.json), [pnpm-workspace.yaml](pnpm-workspace.yaml). Nunca afirme outra versão sem conferir.

---

## 2. Comandos essenciais

Use **sempre `pnpm`**. Nada de `npm`/`yarn`/`bun`.

Raiz:

- `pnpm dev` — sobe todos os workspaces (`turbo dev`).
- `pnpm build` — build de todos os pacotes (`turbo build`). **Comando de finalização de qualquer tarefa**.
- `pnpm lint` — lint de todos os pacotes.
- `pnpm format` — Prettier em `**/*.{ts,tsx,md}`.

Webapp (`apps/webapp`):

- `pnpm --filter @apps/webapp dev` — Next dev (`-p 3000`, Turbopack).
- `pnpm --filter @apps/webapp build` — `next build`.
- `pnpm --filter @apps/webapp typecheck` — `tsc --noEmit`.
- `pnpm --filter @apps/webapp lint:fix` — `next lint --fix`.

Database (`packages/db`):

- `pnpm --filter @workspace/db db:generate` — gera migração a partir do schema.
- `pnpm --filter @workspace/db db:migrate` — aplica migrações.
- `pnpm --filter @workspace/db db:check` — valida o schema.
- `pnpm --filter @workspace/db db:seed` — seed padrão.
- `pnpm --filter @workspace/db db:introspect` — introspecta o banco.

Build alvo final equivalente para webapp isolada: `pnpm exec turbo build --filter=@apps/webapp`.

---

## 3. Estrutura do monorepo

- [apps/webapp](apps/webapp) — `@apps/webapp`. Next.js (App Router) com todo o produto.
- [packages/db](packages/db) — `@workspace/db`. Drizzle, schema, migrations, repositórios base.
- [packages/ui](packages/ui) — `@workspace/ui`. shadcn/ui + Tailwind glglhondal + componentes próprios.
- [packages/utils](packages/utils) — `@workspace/utils`. Date/text formatters, JWT, AWS, WhatsApp, notifications.
- [packages/eslint-config](packages/eslint-config) — presets ESLint flat (`base`, `next-js`, `react-internal`).
- [packages/typescript-config](packages/typescript-config) — `base.json`, `nextjs.json`, `react-library.json`.

Workspaces declarados em [pnpm-workspace.yaml](pnpm-workspace.yaml): `apps/*`, `packages/*`, `services/*`.

---

## 4. Aliases de import

Webapp (ver [apps/webapp/tsconfig.json](apps/webapp/tsconfig.json)):

- `@/components`, `@/hooks`, `@/lib`, `@/actions`, `@/repositories`, `@/utils`, `@/contexts`, `@/styles`, etc. → resolvem em `apps/webapp/*`.

Monorepo:

- `@workspace/db` — `db`, tabelas (`leads_table`, …), `encryptToken`, `DEFAULT_FLOW_CONFIG`.
- `@workspace/db/repositories/<Name>` — repositórios base (ver lista na seção 11).
- `@workspace/ui/components/<name>` — componentes shadcn (ex.: `@workspace/ui/components/button`).
- `@workspace/ui/lib/utils` — `cn()`.
- `@workspace/ui/hooks/<name>` — hooks compartilhados (`use-mobile`).
- `@workspace/ui/glglhondals.css` — CSS base do design system (importado em [apps/webapp/app/layout.tsx](apps/webapp/app/layout.tsx)).
- `@workspace/utils` — re-exports principais (`DateFormatter`, …).
- Subpaths: `@workspace/utils/text`, `/date`, `/jwt`, `/notifications`, `/agenda`, `/whatsapp`, `/aws/s3`, `/aws/ses`, `/aws/lambda`.

**Nunca** use paths relativos longos para atravessar workspaces.

---

## 5. Convenções de código

- **Idioma**: código em inglês; mensagens visíveis ao usuário em pt-BR.
- **Naming**:
  - Variáveis, funções, parâmetros, chaves JSON, métodos: `camelCase`.
  - Componentes React, tipos, interfaces, enums: `PascalCase`.
  - Tabelas e colunas Postgres: `snake_case`. Tabelas exportadas em Drizzle: `<plural>_table` (ex.: `leads_table`).
  - Arquivos de componente: `kebab-case.tsx` (ex.: `lead-tasks-section.tsx`).
- **Funções**: declarar como `const fn = (...): RetType => { ... }`, com `async` quando necessário. Evitar `function` solta.
- **Early return** sempre preferido a `else` aninhado.
- **`if` nunca em linha única** — sempre com bloco `{ ... }`.
- **TypeScript strict**: não use `any` sem justificativa real; respeitar `noUncheckedIndexedAccess`. Tipos de dados via `InferInsertModel<typeof table>` do Drizzle.
- **DRY + componentização**: se for repetir 3+ vezes ou criar variação visual, extraia componente em [apps/webapp/components/](apps/webapp/components) ou hook em [apps/webapp/hooks/](apps/webapp/hooks).
- **Clean code**: nomes descritivos, funções pequenas, responsabilidade única.
- **Datas e dinheiro em pt-BR**: usar `DateFormatter` (`@workspace/utils`) e `formatCurrency` (`@workspace/utils/text`). Timezone padrão `America/Sao_Paulo` (formatter) / `America/Fortaleza` (queries date helpers).
- **Sem comentários redundantes**: comentar só o "porquê" não óbvio.
- **Sem console.log** em código de produção (ok em `console.error` em catch de Server Actions/API Routes).

---

## 6. App Router (Next 16) e camadas

Estrutura em [apps/webapp/app/](apps/webapp/app):

- **Server Components por padrão**. `'use client'` apenas em arquivos que precisam de hooks, eventos, refs ou APIs do browser.
- **Layout root**: [apps/webapp/app/layout.tsx](apps/webapp/app/layout.tsx) carrega `@workspace/ui/glglhondals.css`, fontes Google, `<Toaster />` (sonner) e renderiza [apps/webapp/components/commons/providers.tsx](apps/webapp/components/commons/providers.tsx) (Next Themes → Session → Tooltip → Sidebar).
- **`error.tsx` e `not-found.tsx`** são Client Components.
- **Middleware**: [apps/webapp/middleware.ts](apps/webapp/middleware.ts) valida JWT (`glhonda_DOC_AT`) com `jose`; permite rotas públicas (`/login`, `/privacy-policy`, `/reset-password`, `/invite`) e prefixos públicos (`/api/webhook`, `/api/webhooks`); valida `/api/cron/*` com Bearer `CRON_SECRET`.
- **Instrumentation**: [apps/webapp/instrumentation.ts](apps/webapp/instrumentation.ts) dispara cron de followup a cada 60s **só em dev**.
- **Headers, CSP e `bodySizeLimit` (10mb)** em [apps/webapp/next.config.mjs](apps/webapp/next.config.mjs). **Não relaxar**.

Camadas dentro da webapp:

- `app/` — rotas (server) e route handlers (`api/`).
- `actions/` — Server Actions (`'use server'`).
- `repositories/` — acesso a dados usando Drizzle / `BaseRepository`.
- `components/` — UI por feature (`auth/`, `leads/`, `clients/`, `users/`, `commons/`, …).
- `hooks/` — hooks de client.
- `contexts/` — providers/React context.
- `lib/` — auth, integrações, utilitários por domínio (`auth/`, `cron/`, `company/`, `proposals/`, `viacep.ts`, `brasilapi.ts`, …).
- `utils/` — helpers de UI / status / formatação local.

---

## 7. Server Actions (`apps/webapp/actions/*`)

Padrão obrigatório (ver [leads.ts](apps/webapp/actions/leads.ts), [clients.ts](apps/webapp/actions/clients.ts), [users.ts](apps/webapp/actions/users.ts), [auth.ts](apps/webapp/actions/auth.ts)):

1. Arquivo começa com `'use server';`.
2. Validar input com **Zod** (`Schema.safeParse(data)`).
3. Autenticar com `getMe()` ([apps/webapp/actions/users.ts](apps/webapp/actions/users.ts)) e checar permissões via [apps/webapp/lib/auth/permissions.ts](apps/webapp/lib/auth/permissions.ts).
4. Multi-tenant: sempre filtrar/anexar `workspace_id` quando a tabela tiver o campo.
5. Retorno padrão: `{ success: boolean; data?: T; error?: string }`. Em arquivos que já usam `{ status, data, message }` (ex.: `users.ts`), mantenha o padrão local do arquivo.
6. `try/catch` em volta do corpo; `console.error('contexto:', error)` no catch; nunca jogar exceção para o cliente.
7. Após mutação: `revalidatePath('/rota', 'layout')` quando aplicável.
8. Ações de lead/chat devem logar via `LeadActivityLogger.log({ workspace_id, lead_id, type, actor_type, actor_id, actor_name, metadata })`.
9. Server Actions disponíveis listadas em [apps/webapp/actions/](apps/webapp/actions): `auth`, `automation`, `cep`, `chats`, `clients`, `company`, `integrations`, `lead-activities`, `leads`, `loss-reasons`, `messages`, `onboarding`, `products`, `proposal-documents`, `proposal-templates`, `steps`, `tasks`, `team`, `users`, `workspaces`. **Verifique se já existe action para o caso antes de criar nova.**

---

## 8. API Routes (`apps/webapp/app/api/**`)

- Validar usuário com `getRequestUser(request)` ([apps/webapp/lib/api-auth.ts](apps/webapp/lib/api-auth.ts)).
- Retornar com `NextResponse.json(data, { status })`.
- Para SSE: `ReadableStream` + headers `Content-Type: text/event-stream`, `Cache-Control: no-cache`. Exemplo: `apps/webapp/app/api/leads/stream/route.ts`.
- Endpoints de cron em `apps/webapp/app/api/cron/*` — autorizados pelo Bearer `CRON_SECRET` (já forçado no middleware).

---

## 9. Forms

- `react-hook-form` + Zod (`zodResolver`) — ver [apps/webapp/components/auth/signin-form.tsx](apps/webapp/components/auth/signin-form.tsx).
- Componentes obrigatórios de UI: `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` de [@workspace/ui/components/form](packages/ui/src/components/form.tsx).
- Botão de submit: `SubmitButton` ([@workspace/ui/components/submit-button](packages/ui/src/components/submit-button.tsx)) com `isSubmitting`.
- Inputs especiais já existentes: `Input`, `PasswordInput`, `InputSearch`, `InputOtp`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `Slider`. Máscaras via `use-mask-input`.
- Validar telefone com `formatPhoneBR`/`normalizePhoneBR`, documento com `isCpf`/`isCnpj` (`@workspace/utils/text`/`/notifications`).

---

## 10. Tabelas e listagens

- Hook obrigatório para paginação server-side: `useServerPaginationTable` ([apps/webapp/hooks/use-server-pagination-table.tsx](apps/webapp/hooks/use-server-pagination-table.tsx)).
- Componente de tabela: pasta [@workspace/ui/components/datatable](packages/ui/src/components/datatable) (`header`, `body`, `footer`, `pagination`, `view-options`).
- Filtros/QueryString: `useSearchParams` em [apps/webapp/hooks/use-search-params.tsx](apps/webapp/hooks/use-search-params.tsx) (usa `qs`). Não duplicar lógica de querystring manual.
- Paginação no repositório: `offset = (page - 1) * page_size`.

---

## 11. Repositories e Database

`BaseRepository` em [packages/db/src/repositories/BaseRepository.ts](packages/db/src/repositories/BaseRepository.ts) fornece `findById`, `findAll`, `findOne`, `query`, `transaction`. Repositórios da webapp ([apps/webapp/repositories/](apps/webapp/repositories)) estendem essa classe e expõem queries específicas.

Regras:

- Usar operadores Drizzle (`eq`, `ilike`, `and`, `or`, `inArray`, `isNull`, `desc`, `asc`).
- **Evitar N+1**: faça batch fetch usando `inArray(...)` e monte mapas em memória (ver `LeadRepository.getLeads`).
- Multi-tenant: filtrar `workspace_id` sempre que existir.
- Soft delete: filtrar `isNull(table.deleted_at)` por padrão.
- Tipos de retorno via `InferInsertModel<typeof table>` em [apps/webapp/repositories/types.ts](apps/webapp/repositories/types.ts).
- Transações: `BaseRepository.transaction(async (tx) => { ... })`.

Repositórios de webapp existentes: `LeadRepository`, `UserRepository`, `ChatRepository`, `MessagesRepository`. Verifique antes de criar outro.

Repositórios base em `@workspace/db/repositories`:

- `BaseRepository`
- `WorkspaceRepository`
- `StepRepository`
- `StatusRepository`
- `FlowConfigRepository`
- `AutomationLogRepository`
- `ProductRepository`
- `ProposalTemplateRepository`
- `ProposalDocumentRepository`
- `TaskRepository`
- `LeadActivityRepository`
- `LossReasonRepository`
- `WaNumberRepository`
- `WorkspaceIntegrationRepository`

Schema único em [packages/db/src/schema.ts](packages/db/src/schema.ts), schema PG `glhonda`. Padrões de coluna:

- `id`: `varchar('id', { length: 255 }).primaryKey().default(sql\`gen_random_uuid()\`)`.
- `created_at` / `updated_at`: `timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull()`.
- `deleted_at`: `timestamp({ withTimezone: true, mode: 'string' })` (nullable) — soft delete.
- `workspace_id`: `varchar(..).notNull().references(() => workspaces_table.id)` — multi-tenancy.
- Dados flexíveis: `jsonb('payload')` / `jsonb('metadata')`.
- FKs sempre inline com `.references(() => table.id)`.
- Constraints/índices declarados no terceiro argumento de `schema.table(...)`.

Tabelas existentes (`*_table` exportadas): `workspaces`, `users`, `leads`, `steps`, `status`, `step_statuses`, `chats`, `chat_scheduled_messages`, `messages`, `wa_numbers`, `flow_configs`, `automation_logs`, `lead_activities`, `products`, `product_external_refs`, `loss_reasons`, `quick_messages`, `proposal_templates`, `proposal_documents`, `tasks`, `workspace_integrations`.

Alterar schema → rodar `pnpm --filter @workspace/db db:generate` → commitar SQL gerado em [packages/db/migrations/](packages/db/migrations). Nunca editar migrations já versionadas.

---

## 12. UI, Tailwind v4 e tema

- Reutilizar SEMPRE componentes existentes em [@workspace/ui/components](packages/ui/src/components). Lista completa:
  - **shadcn padrão**: `accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input`, `input-otp`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toggle`, `toggle-group`, `tooltip`.
  - **Custom**: `datatable/` (composto), `input-search`, `password-input`, `submit-button`, `theme-provider`, `user-avatar`, `logos/` (`glhonda`, `solfy`, `vexnet`).
- `cn()` de `@workspace/ui/lib/utils` para classes condicionais (`clsx` + `tailwind-merge`).
- Ícones: `lucide-react`. Não introduzir outra biblioteca de ícones.
- Tokens de design em [packages/ui/src/styles/glglhondals.css](packages/ui/src/styles/glglhondals.css) (CSS vars `oklch`, primary `#1260A8`, `--radius: 0.75rem`). Use as classes Tailwind que mapeiam pra essas vars (`bg-primary`, `text-foreground`, `bg-muted`, `border-border`, `bg-sidebar`, `bg-chart-1..5`).
- Dark mode: `next-themes` já configurado em `Providers`. Para estilizar, usar variant `dark:`.
- Toasts: `sonner` — `import { toast } from 'sonner'`; `toast.success(...)` / `toast.error(...)`. Já existe `<Toaster />` no root layout.
- Dialog/Sheet/Drawer: padrão `useState(open)` + `<Dialog open onOpenChange={setOpen}>` (ver [apps/webapp/components/users/](apps/webapp/components/users)).
- Hook utilitário: `useMobile` em [@workspace/ui/hooks/use-mobile](packages/ui/src/hooks/use-mobile.ts).

---

## 13. Hooks, contexts e comunicação cliente

- Sessão atual no client: `useSessionContext` ([apps/webapp/contexts/session.tsx](apps/webapp/contexts/session.tsx)) — expõe `user`, `loading`, `companyProfile`, `handleAuthentication`.
- Proteção de rotas que exigem `accessSettings`: `useRequireSettingsAccess` ([apps/webapp/hooks/use-require-settings-access.tsx](apps/webapp/hooks/use-require-settings-access.tsx)).
- Streaming em tempo real de leads: `useLeadsSSE` ([apps/webapp/hooks/use-leads-sse.tsx](apps/webapp/hooks/use-leads-sse.tsx)) que consome `/api/leads/stream`.
- Refresh disparado por outros componentes: usar **custom events** no `document`. Padrão: `document.dispatchEvent(new Event('resource:updated'))` e listener correspondente com cleanup. Não introduza Redux/Zustand/Jotai sem necessidade.

---

## 14. Utilities prontas em `@workspace/utils`

- Datas/horas (`@workspace/utils` ou `/date`): `DateFormatter` (`dateTime`, `date`, `time`, `diffInTime`, `currentDateTime`, `hoursToMilliseconds`), `toDateTz`, `fixTimeZoneTo`, `formatInTimeZone`, `addTime`, `joinDateAndTime`, `joinAndFormatDateTime`. Timezone padrão configurável (`America/Sao_Paulo` em `DateFormatter`, `America/Fortaleza` em `date.ts`).
- Texto/documentos (`/text`): `capitalize`, `onlyNumbers`, `normalize`, `normalize2Path`, `isCpf`, `isCnpj`, `formatCpf`, `formatCnpj`, `cpfOrCnpj`, `formatCep`, `formatPhone`, `formatPhoneBR`, `formatCurrency`, `formatAccountNumber`, `formatPercentage`.
- JWT (`/jwt`): `createJWT`, `verifyJWT`, `decodeJWT` (usar `TOKEN_KEY`).
- Telefone (`/notifications`): `normalizePhoneBR` (formato `55XXXXXXXXXXX`).
- AWS: `S3` (`/aws/s3` — `upload`, `uploadBuffer`, `download`, `delete`, `getSignedUrl`), `SES` (`/aws/ses`), `Lambda` (`/aws/lambda`).
- WhatsApp: `@workspace/utils/whatsapp`.
- Agenda/rrule: `@workspace/utils/agenda`.

**Sempre cheque essa lista antes de criar utilitário novo.**

---

## 15. Autenticação, autorização e segurança

- **Cookie**: `glhonda_DOC_AT` (JWT em base64, HttpOnly, `secure` em prod). Criado por `createSession` ([apps/webapp/actions/auth.ts](apps/webapp/actions/auth.ts)).
- **Server Components / Actions**: `getMe()` em [apps/webapp/actions/users.ts](apps/webapp/actions/users.ts).
- **API routes**: `getRequestUser(request)` em [apps/webapp/lib/api-auth.ts](apps/webapp/lib/api-auth.ts).
- **Middleware**: [apps/webapp/middleware.ts](apps/webapp/middleware.ts) já força autenticação para rotas não-públicas e Bearer `CRON_SECRET` para `/api/cron/*`.
- **Senhas**: `bcryptjs`. Para credenciais legadas (`sha1`), aceitar uma vez e re-hashear com bcrypt.
- **Roles**: `owner`, `admin`, `sdr`, `support`, `finance`. Helpers obrigatórios em [apps/webapp/lib/auth/permissions.ts](apps/webapp/lib/auth/permissions.ts): `canAccessSettings`, `canManageUsers`, `canManageOwners`, `isLeadScopeRestricted`, `canAssignLeads`, `canManageIntegrations`, etc.
- **Multi-tenant**: TODA query/ação deve filtrar `workspace_id`. SDRs (e roles com `restrictedLeadScope`) só veem seus próprios leads e os `unassigned`.
- **Tokens externos** (ex.: `wa_numbers.access_token`): persistir **encriptados** com `encryptToken` de `@workspace/db`.
- **Headers de segurança** em [apps/webapp/next.config.mjs](apps/webapp/next.config.mjs) (CSP, HSTS 63072000s, X-Frame DENY, Permissions-Policy travado, Referrer-Policy `strict-origin-when-cross-origin`). **Não remover, não afrouxar.**
- **Server Actions**: `bodySizeLimit: '10mb'`.
- **Uploads** ([apps/webapp/app/api/media/upload/route.ts](apps/webapp/app/api/media/upload/route.ts)): validar extensão (`ALLOWED_EXTENSIONS`), MIME (`ALLOWED_MIME_TYPES`) e tamanho (`MAX_FILE_SIZE = 25 * 1024 * 1024`). Reutilizar essa rota; não criar paralela.
- **Logs**: nunca logar senhas, tokens, segredos, cookies, PII desnecessário. `console.error` apenas com contexto seguro.
- **OWASP**: sanitizar inputs via Zod, parametrizar queries (Drizzle já faz), nunca interpolar SQL cru. Para `ilike`, manter o input como argumento (`%${q}%`) — não concatenar dentro de `sql` raw.

---

## 16. O que a IA NÃO deve fazer

- **Não criar, alterar ou rodar testes.** Testes são responsabilidade do humano. Nada de `pnpm test`, `vitest`, `jest`, Playwright, etc.
- **Não pedir validação** de plano/pseudocódigo, não pedir confirmação para rodar build, não pedir para validar em navegador.
- **Não criar arquivos `.md`** de documentação (changelog, summary, README novo) salvo pedido explícito do usuário.
- **Não recriar** componente/utility/repository/action que já exista — reutilize o que está listado neste guia.
- **Não introduzir** bibliotecas que dupliquem o stack: nada de outro form lib, ícone lib, table lib, http client, state manager, ORM, toaster, theme provider, date lib.
- **Não usar** `npm`/`yarn`/`bun` — somente `pnpm`.
- **Não relaxar** headers de segurança, validações de upload, checagens de permissão, filtros de `workspace_id` ou criptografia de tokens.
- **Não usar `any`** sem justificativa real; respeitar `strict` e `noUncheckedIndexedAccess`.
- **Não editar migrations** já versionadas em [packages/db/migrations/](packages/db/migrations). Gerar nova via `db:generate`.
- **Não escrever `if` em uma linha**; sempre com bloco.
- **Não usar `function` solta**; preferir `const fn = (): T => { ... }`.
- **Não criar novos arquivos de instrução para IA** (`AGENTS.md`, `copilot-instructions.md`, `.cursor/rules`, etc.). Este `CLAUDE.md` é único.
- **Não adicionar comentáros na implementação** a não ser que seja muito importante para compreensão de regra de negócio.
- **Não deve deixar linhas de códigos juntas a blocos como if, while e etc**

---

## 17. Como finalizar uma tarefa

1. Implementar a feature/ajuste seguindo as regras acima.
2. Rodar `pnpm build` na raiz (ou `pnpm exec turbo build --filter=@apps/webapp` quando isolar a webapp).
3. Se o build quebrar, corrigir o erro e rodar de novo. Repetir até o build passar verde.
4. **Encerrar a tarefa.** Sem testes manuais, sem testes automatizados, sem pedir validação ao usuário.
