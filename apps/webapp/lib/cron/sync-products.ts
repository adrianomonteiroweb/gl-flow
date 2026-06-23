import { db, workspaces_table } from '@workspace/db';
import { syncVoalleProducts, type SyncResult } from '@/lib/products';

export type SyncProductsCronResult = {
  workspaces: number;
  results: Array<{ workspaceId: string; result: SyncResult }>;
};

export const runSyncProductsCron = async (): Promise<SyncProductsCronResult> => {
  const workspaces = await db.select().from(workspaces_table);

  console.log('[SyncProductsCron] Iniciando sync para', workspaces.length, 'workspaces');

  const results: SyncProductsCronResult['results'] = [];

  for (const workspace of workspaces) {
    try {
      const result = await syncVoalleProducts(workspace.id);
      results.push({ workspaceId: workspace.id, result });
      console.log('[SyncProductsCron] Workspace', workspace.slug, ':', result);
    } catch (err) {
      console.error('[SyncProductsCron] Erro no workspace', workspace.slug, ':', err);
      results.push({
        workspaceId: workspace.id,
        result: { created: 0, updated: 0, removed: 0, errors: [String(err)] },
      });
    }
  }

  return { workspaces: workspaces.length, results };
};
