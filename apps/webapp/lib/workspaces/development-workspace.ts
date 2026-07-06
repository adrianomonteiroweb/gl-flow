import { eq } from 'drizzle-orm';
import { db, workspaces_table, provisionWorkspacePipeline } from '@workspace/db';

export type WorkspaceOwner = {
  workspace_id?: string | null;
};

const DEFAULT_WORKSPACE_SLUG = 'default';

export const getDefaultWorkspaceId = async (): Promise<string | null> => {
  const [existing] = await db
    .select({ id: workspaces_table.id })
    .from(workspaces_table)
    .where(eq(workspaces_table.slug, DEFAULT_WORKSPACE_SLUG))
    .limit(1);

  if (existing?.id) {
    return existing.id;
  }

  const [created] = await db
    .insert(workspaces_table)
    .values({
      name: 'Workspace Padrão',
      slug: DEFAULT_WORKSPACE_SLUG,
    })
    .onConflictDoNothing()
    .returning({ id: workspaces_table.id });

  if (created?.id) {
    await provisionWorkspacePipeline(created.id);
    return created.id;
  }

  const [fallback] = await db.select({ id: workspaces_table.id }).from(workspaces_table).limit(1);
  return fallback?.id ?? null;
};

export const resolveWorkspaceId = async (owner: WorkspaceOwner): Promise<string | null> => {
  if (owner.workspace_id) {
    return owner.workspace_id;
  }

  return getDefaultWorkspaceId();
};
