# SPEC_COMPACT

OBJETIVO:
Padronização de arquitetura, código e manutenção.

STACK:

- Next16
- React19
- TS strict
- Tailwind4
- shadcn/ui
- PostgreSQL
- Drizzle
- Turborepo
- pnpm

PRINCÍPIOS:

- Clean Code
- DRY
- Type Safety
- Maintainability
- Performance

NOMENCLATURA:

- vars/functions: camelCase
- constants: UPPER_CASE
- db/api fields: snake_case
- components/interfaces/types: PascalCase
- files/folders: kebab-case
- hooks: use\*

ESTILO:

- arrow functions
- early return
- guard clauses
- if sempre com bloco
- sem comentários redundantes
- separar blocos lógicos com linhas vazias
- nomes descritivos

IMPORTS:

1. externos
2. workspace
3. internos

SERVER ACTIONS:

- 'use server'
- Zod
- getMe()
- try/catch
- revalidatePath()
- retorno:

  - success=true,data
  - success=false,error

REPOSITORIES:

- BaseRepository
- filtros em arrays + and()
- evitar N+1
- batch fetch
- paginação offset
- exportar tipos reutilizáveis

COMPONENTES:
ORDEM:

1. imports
2. types/interfaces
3. constants
4. component
5. handlers
6. render

TS:

- export type compartilhado
- interface para props
- discriminated unions
- evitar generics excessivos
- evitar any

EXPORTS:

- named exports padrão
- default export apenas páginas

UI:

- usar @workspace/ui
- usar cn()
- usar tokens semânticos
- evitar classes condicionais manuais

ERROR HANDLING:

- try/catch obrigatório em async críticos
- console.error
- Zod.safeParse
- toast.success/error

BEST PRACTICES:

- DRY
- guard clauses
- batch queries
- memoização quando necessário
- sem duplicação de lógica

PATHS:

- usar aliases
- evitar imports relativos longos

DADOS:

- ISO8601
- timezone aware
- arrays URL => CSV
- mensagens UI => pt-BR

PERFORMANCE:

- evitar N+1
- useMemo para computações caras
- lazy loading quando aplicável

REVIEW:

- sem any
- sem if inline
- sem duplicação
- validação Zod
- tipagem forte
- aliases corretos
- mensagens pt-BR
- timestamps ISO8601
