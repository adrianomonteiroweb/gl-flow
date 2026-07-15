import { isNotNull } from 'drizzle-orm';

import { db } from '../src/db';
import { clients_table } from '../src/schema';

async function check() {
  const deleted_leads = await db
    .select()
    .from(clients_table)
    .where(isNotNull(clients_table.deleted_at));

  console.log('Leads com deleted_at setado:\n');
  deleted_leads.forEach(l => {
    console.log(`  • ${l.name} | deleted_at: ${l.deleted_at} | status: ${l.status}`);
  });

  console.log(`\nTotal: ${deleted_leads.length}`);
  process.exit(0);
}

check();
