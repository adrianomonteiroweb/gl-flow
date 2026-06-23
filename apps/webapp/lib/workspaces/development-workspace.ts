import { eq } from 'drizzle-orm';
import { db, workspaces_table, provisionWorkspacePipeline } from '@workspace/db';

export type WorkspaceOwner = {
  workspace_id?: string | null;
};

const DEVELOPMENT_WORKSPACE_ID = 'default';
const DEVELOPMENT_WORKSPACE_SLUG = 'default';

export const getDevelopmentWorkspaceId = async (): Promise<string | null> => {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const [defaultWorkspace] = await db
    .select({ id: workspaces_table.id })
    .from(workspaces_table)
    .where(eq(workspaces_table.slug, DEVELOPMENT_WORKSPACE_SLUG))
    .limit(1);

  if (defaultWorkspace?.id) {
    return defaultWorkspace.id;
  }

  const [createdWorkspace] = await db
    .insert(workspaces_table)
    .values({
      id: DEVELOPMENT_WORKSPACE_ID,
      name: 'Default',
      slug: DEVELOPMENT_WORKSPACE_SLUG,
    })
    .onConflictDoNothing()
    .returning({ id: workspaces_table.id });

  if (createdWorkspace?.id) {
    await provisionWorkspacePipeline(createdWorkspace.id);
    return createdWorkspace.id;
  }

  const [workspace] = await db.select({ id: workspaces_table.id }).from(workspaces_table).limit(1);
  return workspace?.id ?? null;
};

export const resolveWorkspaceId = async (owner: WorkspaceOwner): Promise<string | null> => {
  if (owner.workspace_id) {
    return owner.workspace_id;
  }

  return getDevelopmentWorkspaceId();
};
