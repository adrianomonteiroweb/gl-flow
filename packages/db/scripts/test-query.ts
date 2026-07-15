import { and, eq, isNull, desc } from 'drizzle-orm';

import { db } from '../src/db';
import { clients_table } from '../src/schema';

async function testQuery() {
  console.log('📊 Testando queries de leads...\n');

  // Find any workspace first
  const any_workspace = await db
    .selectDistinct({ workspace_id: clients_table.workspace_id })
    .from(clients_table)
    .limit(1);

  if (!any_workspace[0]) {
    console.log('Nenhum cliente encontrado no banco.');
    process.exit(0);
  }

  const workspace_id = any_workspace[0].workspace_id;
  console.log(`Usando workspace: ${workspace_id}\n`);

  // Query 1: Sem filtro deleted_at (o que está acontecendo?)
  const all_leads = await db
    .select()
    .from(clients_table)
    .where(
      and(eq(clients_table.workspace_id, workspace_id), eq(clients_table.source, 'lead'))
    )
    .orderBy(desc(clients_table.created_at));

  console.log(`Leads SEM filtro deleted_at: ${all_leads.length}`);
  all_leads.forEach(l => {
    console.log(`  • ${l.name} | deleted_at: ${l.deleted_at ? '✓ SIM' : '✗ NULL'}`);
  });

  // Query 2: COM filtro deleted_at IS NULL (como deveria ser)
  const active_leads = await db
    .select()
    .from(clients_table)
    .where(and(eq(clients_table.workspace_id, workspace_id), eq(clients_table.source, 'lead'), isNull(clients_table.deleted_at)))
    .orderBy(desc(clients_table.created_at));

  console.log(`\nLeads COM filtro deleted_at IS NULL: ${active_leads.length}`);
  active_leads.forEach(l => {
    console.log(`  • ${l.name} | deleted_at: ${l.deleted_at ? '✓ SIM' : '✗ NULL'}`);
  });

  console.log(`\nDiferença: ${all_leads.length - active_leads.length} leads deletados sendo exibidos quando não deveriam`);
  process.exit(0);
}

testQuery();
