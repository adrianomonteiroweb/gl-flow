import { and, isNotNull, isNull, eq } from 'drizzle-orm';

import { db } from '../src/db';
import { clients_table } from '../src/schema';

async function deleteCompleteLeads() {
  console.log('🗑️  Deletando leads com cadastro completo...\n');

  try {
    const leads_to_delete = await db
      .select()
      .from(clients_table)
      .where(
        and(
          eq(clients_table.source, 'lead'),
          isNotNull(clients_table.document),
          isNull(clients_table.deleted_at)
        )
      );

    console.log(`Encontrados ${leads_to_delete.length} leads com cadastro completo.\n`);

    if (leads_to_delete.length === 0) {
      console.log('Nenhum lead para deletar.');
      process.exit(0);
    }

    const now = new Date().toISOString();

    for (const lead of leads_to_delete) {
      await db
        .update(clients_table)
        .set({ deleted_at: now, status: 'inactive', updated_at: now })
        .where(eq(clients_table.id, lead.id));

      console.log(`✓ Deletado: ${lead.name} (${lead.document})`);
    }

    console.log(`\n✅ ${leads_to_delete.length} lead(s) deletado(s) com sucesso.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

deleteCompleteLeads();
