import { sql } from 'drizzle-orm';
import { numeric, primaryKey, boolean, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { pgSchema, varchar, jsonb, timestamp, text } from 'drizzle-orm/pg-core';

export const schema = pgSchema('glflow');

// ─── Workspaces (must be first — referenced by users, leads) ──────────────────
export const workspaces_table = schema.table('workspaces', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),

  payload: jsonb('payload'),
  metadata: jsonb('metadata'),

  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

// ─── Users ────────────────────────────────────────────────────────────────────
export const users_table = schema.table('users', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  email: varchar('email', { length: 255 }).unique().notNull(),

  name: varchar('name', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }),

  role: varchar('role', { length: 50 }).default('member').notNull(),

  workspace_id: varchar('workspace_id', { length: 255 }).references(() => workspaces_table.id),

  payload: jsonb('payload'),
  metadata: jsonb('metadata'),

  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

// ─── Leads ────────────────────────────────────────────────────────────────────
// The lead itself is the pipeline card: it carries its position
// (pipeline_id / step_id / status_id), responsible (assignee_id) and the
// won/lost outcome. `status` is the client lifecycle flag (active/inactive),
// distinct from the kanban `status_id`.
export const leads_table = schema.table(
  'leads',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),

    workspace_id: varchar('workspace_id', { length: 255 }).references(() => workspaces_table.id),

    // Pipeline position — the lead traverses the pipeline directly.
    pipeline_id: varchar('pipeline_id', { length: 255 }).references(() => pipelines_table.id),
    step_id: varchar('step_id', { length: 255 }).references(() => steps_table.id),
    status_id: varchar('status_id', { length: 255 }).references(() => status_table.id),
    assignee_id: varchar('assignee_id', { length: 255 }).references(() => users_table.id),

    sort_order: integer('sort_order').default(0).notNull(),

    address: jsonb('address'),
    loss_reason: varchar('loss_reason', { length: 500 }),

    // Client lifecycle flag (active/inactive), independent of the kanban status_id.
    status: varchar('status', { length: 50 }).default('active').notNull(),

    won_at: timestamp('won_at', { withTimezone: true, mode: 'string' }),
    lost_at: timestamp('lost_at', { withTimezone: true, mode: 'string' }),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  table => [
    index('idx_leads_phone').on(table.phone),
    index('idx_leads_workspace').on(table.workspace_id),
    index('idx_leads_pipeline_step').on(table.workspace_id, table.pipeline_id, table.step_id),
    index('idx_leads_assignee').on(table.assignee_id),
    uniqueIndex('uq_lead_phone_workspace')
      .on(table.phone, table.workspace_id)
      .where(sql`phone IS NOT NULL AND workspace_id IS NOT NULL`),
  ]
);

// ─── Pipelines ────────────────────────────────────────────────────────────────
export const pipelines_table = schema.table(
  'pipelines',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 })
      .notNull()
      .references(() => workspaces_table.id),

    name: varchar('name', { length: 255 }).notNull(),
    sort_order: integer('sort_order').default(0).notNull(),
    is_default: boolean('is_default').default(false).notNull(),
    is_active: boolean('is_active').default(true).notNull(),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  table => [
    index('idx_pipelines_workspace').on(table.workspace_id),
    uniqueIndex('uq_pipeline_workspace_name')
      .on(table.workspace_id, table.name)
      .where(sql`deleted_at IS NULL`),
  ]
);

// ─── Steps ────────────────────────────────────────────────────────────────────
// is_post_sale marks read-only-for-salesperson stages (faturamento, entrega,
// transporte, emplacamento): a `member` can view but not move leads in/within them.
export const steps_table = schema.table(
  'steps',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    pipeline_id: varchar('pipeline_id', { length: 255 }).references(() => pipelines_table.id),
    workspace_id: varchar('workspace_id', { length: 255 }).references(() => workspaces_table.id),

    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }),
    order: numeric('order').default('0').notNull(),
    color: varchar('color', { length: 30 }),

    is_post_sale: boolean('is_post_sale').default(false).notNull(),
    is_system: boolean('is_system').default(false).notNull(),
    is_active: boolean('is_active').default(true).notNull(),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  table => [index('idx_steps_workspace_pipeline').on(table.workspace_id, table.pipeline_id)]
);

// ─── Status ───────────────────────────────────────────────────────────────────
export const status_table = schema.table(
  'status',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 }).references(() => workspaces_table.id),

    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }),
    is_universal: boolean('is_universal').default(false).notNull(),

    is_system: boolean('is_system').default(false).notNull(),
    is_active: boolean('is_active').default(true).notNull(),

    color: varchar('color', { length: 30 }),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  table => [index('idx_status_workspace').on(table.workspace_id)]
);

// ─── Step × Status junction ───────────────────────────────────────────────────
export const step_statuses = schema.table(
  'step_statuses',
  {
    step_id: varchar('step_id', { length: 255 })
      .notNull()
      .references(() => steps_table.id),
    status_id: varchar('status_id', { length: 255 })
      .notNull()
      .references(() => status_table.id),

    sort_order: integer('sort_order').default(0).notNull(),
    color: varchar('color', { length: 30 }),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  table => [primaryKey(table.step_id, table.status_id)]
);

// ─── Lead Activities (append-only timeline / lead history) ────────────────────
// Records every business milestone for a lead: creation (with origin), info /
// address / loss-reason updates, kanban status & step changes, assignment,
// won/lost and manual notes. Append-only (INSERT only) for an auditable history.
//
// type values: lead_created | info_updated | address_updated | loss_reason_set
//              loss_reason_cleared | status_changed | step_changed | assignee_changed
//              lead_won | lead_closed | note_added
export const lead_activities_table = schema.table(
  'lead_activities',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 }),
    lead_id: varchar('lead_id', { length: 255 })
      .notNull()
      .references(() => leads_table.id),

    type: varchar('type', { length: 50 }).notNull(),

    // actor_type values: user | system
    actor_type: varchar('actor_type', { length: 20 }).notNull(),
    actor_id: varchar('actor_id', { length: 255 }),
    actor_name: varchar('actor_name', { length: 255 }),

    description: text('description'),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('idx_lead_activities_lead').on(table.lead_id),
    index('idx_lead_activities_ws_created').on(table.workspace_id, table.created_at),
  ]
);
