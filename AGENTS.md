# LINHARESFLOW_AI_RULES

PRIORIDADE:

- Este documento prevalece sobre qualquer outro guia IA.
- Idioma: código=en, UI=pt-BR.

STACK:

- Monorepo: Turborepo + pnpm + Node20+
- Next16(App Router)+React19+TS(strict,noUncheckedIndexedAccess)
- shadcn/Radix + Tailwind v4
- RHF+Zod
- Tanstack Table
- TipTap
- PostgreSQL + Drizzle
- JWT HttpOnly cookie
- AWS S3/SES/Lambda

COMANDOS:

- pnpm dev
- pnpm build
- pnpm lint
- pnpm format
- db:generate
- db:migrate

WORKSPACES:

- apps/webapp
- packages/db
- packages/ui
- packages/utils

IMPORTS:

- usar aliases @/\*
- usar @workspace/\*
- evitar relativos entre workspaces

NAMING:

- vars=snake_case
- funcs=camelCase
- components/types/enums=PascalCase
- files=kebab-case
- db=snake_case
- tables=<plural>\_table

CODE:

- const fn=()=>{}
- evitar function
- early return
- if sempre com {}
- sem any sem motivo
- DRY
- SRP
- sem console.log
- comentários apenas quando necessário

NEXT:

- Server Components default
- use client somente quando necessário
- middleware obrigatório
- CSP/headers não relaxar

ACTIONS:

- 'use server'
- Zod.safeParse
- getMe()
- validar permissões
- filtrar workspace_id
- try/catch obrigatório
- console.error apenas no catch
- revalidatePath após mutações
- retorno padrão:
  {success,data,error}

API:

- getRequestUser()
- NextResponse.json()
- cron protegido por CRON_SECRET

FORMS:

- RHF+ZodResolver
- usar componentes Form do design system
- SubmitButton
- máscaras existentes

TABLES:

- useServerPaginationTable
- datatable shared
- paginação=(page-1)\*page_size

DATABASE:

- usar repositories existentes
- usar operadores Drizzle
- evitar N+1
- workspace_id obrigatório
- soft delete => deleted_at IS NULL
- transações via BaseRepository.transaction

SCHEMA:

- id uuid
- created_at
- updated_at
- deleted_at
- workspace_id
- payload/metadata=jsonb

MIGRATIONS:

- alterar schema => db:generate
- nunca editar migration versionada

UI:

- reutilizar componentes existentes
- usar cn()
- ícones=lucide-react
- tema=next-themes
- toast=sonner
- dark mode suportado

STATE:

- Session => useSessionContext
- SSE => useLeadsSSE
- comunicação => CustomEvents
- não adicionar Redux/Zustand

UTILS:

- reutilizar @workspace/utils antes de criar novos helpers
- datas => DateFormatter
- moeda => formatCurrency
- telefone => normalizePhoneBR
- jwt => createJWT/verifyJWT

SECURITY:

- JWT cookie HttpOnly
- bcrypt
- roles existentes
- workspace_id obrigatório
- tokens externos criptografados
- manter CSP/HSTS/XFO
- validar uploads
- não logar segredos
- evitar SQL raw

PROIBIDO:

- criar/rodar testes
- pedir validação
- criar .md
- duplicar actions/repos/utils/components
- instalar libs redundantes
- usar npm/yarn/bun
- relaxar segurança
- usar any sem motivo
- editar migrations antigas
- if inline
- function solta
- criar arquivos de instruções IA

FINALIZAÇÃO:

1. Implementar
2. realizar code review
3. Encerrar
