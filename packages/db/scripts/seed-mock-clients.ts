/**
 * Seed mock integration clients for testing the "existing client match" flow.
 *
 * Usage (PowerShell — certifique-se de estar apontando para o banco local):
 *   $env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/linharesflow"
 *   pnpm --filter @workspace/db exec tsx scripts/seed-mock-clients.ts
 *
 * Para um workspace específico:
 *   pnpm --filter @workspace/db exec tsx scripts/seed-mock-clients.ts --workspace <workspace_id>
 *
 * Flags:
 *   --workspace <id>   usa o workspace_id informado (padrão: primeiro workspace encontrado)
 *   --clean            remove os clientes mock antes de recriar
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { and, eq, ilike } from 'drizzle-orm';

import { workspaces_table, clients_table } from '../src/schema';

async function main() {
  const args = process.argv.slice(2);
  const workspaceArgIdx = args.indexOf('--workspace');
  const explicitWorkspaceId = workspaceArgIdx !== -1 ? args[workspaceArgIdx + 1] : undefined;
  const clean = args.includes('--clean');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.LOCAL === '1' ? false : { rejectUnauthorized: false },
  });

  const db = drizzle(pool);

  // ── Resolve workspace ────────────────────────────────────────────────────────

  let workspace_id: string;

  if (explicitWorkspaceId) {
    workspace_id = explicitWorkspaceId;
    console.log(`Using workspace: ${workspace_id}`);
  } else {
    // Espelha resolveWorkspaceId: prioriza slug='default', cai para o primeiro se não existir.
    const [bySlug] = await db
      .select({ id: workspaces_table.id, name: workspaces_table.name })
      .from(workspaces_table)
      .where(eq(workspaces_table.slug, 'default'))
      .limit(1);

    const found = bySlug ?? (await db.select({ id: workspaces_table.id, name: workspaces_table.name }).from(workspaces_table).limit(1))[0];

    if (!found) {
      console.error('Nenhum workspace encontrado no banco. Rode o seed principal primeiro.');
      process.exit(1);
    }
    workspace_id = found.id;
    console.log(`Workspace: ${found.name} (${workspace_id})`);
  }

  // ── Limpar clientes mock existentes (opcional) ────────────────────────────────
  if (clean) {
    const deleted = await db
      .delete(clients_table)
      .where(and(eq(clients_table.workspace_id, workspace_id), ilike(clients_table.name, '%[MOCK]%')));
    console.log('Clientes mock removidos:', deleted);
  }

  // ── Dados mock ────────────────────────────────────────────────────────────────
  // Telefones intencionalmente com formatação variada para testar a normalização.
  const mocks = [
    {
      workspace_id,
      source: 'integration' as const,
      person_type: 'pf' as const,
      name: '[MOCK] Ana Paula Ferreira',
      document: '123.456.789-09',
      phone: '(31) 98765-4321', // formatado — teste de normalização de dígitos
      email: 'ana.paula@exemplo.com.br',
      address: {
        street: 'Rua das Flores',
        number: '42',
        complement: 'Apto 3',
        neighborhood: 'Centro',
        city: 'Belo Horizonte',
        state: 'MG',
        zipCode: '30130000',
      },
      status: 'active' as const,
    },
    {
      workspace_id,
      source: 'integration' as const,
      person_type: 'pj' as const,
      name: '[MOCK] Comércio Silva Ltda',
      trade_name: 'Silva Auto',
      document: '12.345.678/0001-90',
      phone: '5531912345678', // com DDI 55 e sem formatação — teste do matcher 55+canônico
      email: 'contato@silvauto.com.br',
      phone_secondary: '(31) 3333-4444',
      address: {
        street: 'Av. Afonso Pena',
        number: '1000',
        neighborhood: 'Funcionários',
        city: 'Belo Horizonte',
        state: 'MG',
        zipCode: '30130001',
      },
      status: 'active' as const,
    },
    {
      workspace_id,
      source: 'integration' as const,
      person_type: 'pf' as const,
      name: '[MOCK] Carlos Eduardo Souza',
      document: '987.654.321-00',
      phone: '31955550001', // sem formatação, sem DDI — forma mais crua
      email: 'CARLOS.SOUZA@GMAIL.COM', // maiúsculas — teste de case-insensitive no e-mail
      status: 'active' as const,
    },
  ];

  // ── Inserir (ignorar conflito de telefone se já existir) ──────────────────────
  let inserted = 0;
  for (const mock of mocks) {
    try {
      await db.insert(clients_table).values(mock);
      console.log(`  ✓ ${mock.name}`);
      inserted++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('uq_client_workspace_phone') || msg.includes('uq_client_workspace_document')) {
        console.log(`  ⚠ ${mock.name} — já existe (conflict), pulando`);
      } else {
        console.error(`  ✗ ${mock.name}:`, msg);
      }
    }
  }

  console.log(`\nPronto! ${inserted} cliente(s) mock inseridos.`);
  console.log('\nTelefones para testar no Cadastro Rápido:');
  console.log('  Ana Paula   → (31) 98765-4321  ou  ana.paula@exemplo.com.br');
  console.log('  Silva Auto  → (31) 91234-5678  ou  contato@silvauto.com.br');
  console.log('  Carlos      → (31) 95555-0001  ou  carlos.souza@gmail.com');

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
