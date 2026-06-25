import { sql } from 'drizzle-orm';
import { numeric, primaryKey, boolean, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { pgSchema, varchar, jsonb, timestamp, text } from 'drizzle-orm/pg-core';

export const schema = pgSchema('linharesflow');

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
  // Branch (filial) the user belongs to. Nullable: owners/admins span all branches.
  branch_id: varchar('branch_id', { length: 255 }).references(() => branches_table.id),

  payload: jsonb('payload'),
  metadata: jsonb('metadata'),

  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, table => [index('idx_users_branch').on(table.branch_id)]);

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
  table => [index('idx_lead_activities_lead').on(table.lead_id), index('idx_lead_activities_ws_created').on(table.workspace_id, table.created_at)]
);

// ─── Tasks (per-lead follow-up tasks with a due date) ─────────────────────────
export const tasks_table = schema.table(
  'tasks',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 })
      .notNull()
      .references(() => workspaces_table.id),
    lead_id: varchar('lead_id', { length: 255 })
      .notNull()
      .references(() => leads_table.id),
    assignee_id: varchar('assignee_id', { length: 255 }).references(() => users_table.id),

    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),

    due_date: timestamp('due_date', { withTimezone: true, mode: 'string' }).notNull(),
    completed_at: timestamp('completed_at', { withTimezone: true, mode: 'string' }),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  table => [
    index('idx_tasks_lead').on(table.lead_id),
    index('idx_tasks_workspace').on(table.workspace_id),
    index('idx_tasks_assignee').on(table.assignee_id),
  ]
);

// ─── Loss reasons (configurable reasons a negotiation was lost) ───────────────
export const loss_reasons_table = schema.table(
  'loss_reasons',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 })
      .notNull()
      .references(() => workspaces_table.id),

    name: varchar('name', { length: 255 }).notNull(),
    sort_order: integer('sort_order').default(0).notNull(),
    is_active: boolean('is_active').default(true).notNull(),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  table => [
    index('idx_loss_reasons_workspace').on(table.workspace_id),
    uniqueIndex('uq_loss_reason_workspace_name')
      .on(table.workspace_id, table.name)
      .where(sql`deleted_at IS NULL`),
  ]
);

// ─── Branches (filiais — physical dealership locations within the workspace) ───
// Sub-units of the single workspace (NOT separate workspaces), so cross-branch
// reporting stays possible. Users, vehicles and negotiations reference a branch.
export const branches_table = schema.table(
  'branches',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 })
      .notNull()
      .references(() => workspaces_table.id),

    name: varchar('name', { length: 255 }).notNull(),
    cnpj: varchar('cnpj', { length: 18 }),
    phone: varchar('phone', { length: 50 }),
    email: varchar('email', { length: 255 }),
    address: jsonb('address'),

    is_active: boolean('is_active').default(true).notNull(),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  table => [
    index('idx_branches_workspace').on(table.workspace_id),
    uniqueIndex('uq_branch_workspace_name')
      .on(table.workspace_id, table.name)
      .where(sql`deleted_at IS NULL`),
    uniqueIndex('uq_branch_workspace_cnpj')
      .on(table.workspace_id, table.cnpj)
      .where(sql`cnpj IS NOT NULL AND deleted_at IS NULL`),
  ]
);

// ─── Clients (clientes — durable person/company master) ───────────────────────
// One client → many negotiations (a person buys multiple vehicles over time and
// can hold several deals in parallel). `id` is overridable so a salesperson can
// create the client offline with a device-generated UUID (offline-first queue).
export const clients_table = schema.table(
  'clients',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 })
      .notNull()
      .references(() => workspaces_table.id),
    branch_id: varchar('branch_id', { length: 255 }).references(() => branches_table.id),
    assignee_id: varchar('assignee_id', { length: 255 }).references(() => users_table.id),

    // pf = pessoa física (CPF) | pj = pessoa jurídica (CNPJ)
    person_type: varchar('person_type', { length: 2 }).default('pf').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    trade_name: varchar('trade_name', { length: 255 }),

    document: varchar('document', { length: 18 }),
    rg: varchar('rg', { length: 20 }),
    cnh: varchar('cnh', { length: 20 }),

    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    phone_secondary: varchar('phone_secondary', { length: 50 }),
    // birth_date = nascimento (PF) | founding_date = data de abertura (PJ).
    birth_date: timestamp('birth_date', { withTimezone: true, mode: 'string' }),
    founding_date: timestamp('founding_date', { withTimezone: true, mode: 'string' }),
    marital_status: varchar('marital_status', { length: 30 }),
    address: jsonb('address'),
    // partners = quadro de sócios (PJ) — array estruturado de pessoas físicas.
    partners: jsonb('partners'),

    status: varchar('status', { length: 50 }).default('active').notNull(),
    // Capture timestamp on the device when created offline (created_at = server receipt).
    client_created_at: timestamp('client_created_at', { withTimezone: true, mode: 'string' }),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  table => [
    index('idx_clients_workspace').on(table.workspace_id),
    index('idx_clients_branch').on(table.branch_id),
    index('idx_clients_assignee').on(table.assignee_id),
    index('idx_clients_phone').on(table.phone),
    uniqueIndex('uq_client_workspace_document')
      .on(table.workspace_id, table.document)
      .where(sql`document IS NOT NULL AND deleted_at IS NULL`),
    uniqueIndex('uq_client_workspace_phone')
      .on(table.workspace_id, table.phone)
      .where(sql`phone IS NOT NULL AND deleted_at IS NULL`),
  ]
);

// ─── Negotiations (negociações — the pipeline card) ───────────────────────────
// The deal/card that traverses the pipeline (pipeline/step/status/assignee,
// won/lost). Many negotiations → one client. Replaces the conflated leads card;
// during backfill negotiation.id reuses the old lead.id so existing FKs survive.
export const negotiations_table = schema.table(
  'negotiations',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 })
      .notNull()
      .references(() => workspaces_table.id),
    client_id: varchar('client_id', { length: 255 }).references(() => clients_table.id),
    branch_id: varchar('branch_id', { length: 255 }).references(() => branches_table.id),

    title: varchar('title', { length: 255 }),

    pipeline_id: varchar('pipeline_id', { length: 255 }).references(() => pipelines_table.id),
    step_id: varchar('step_id', { length: 255 }).references(() => steps_table.id),
    status_id: varchar('status_id', { length: 255 }).references(() => status_table.id),
    assignee_id: varchar('assignee_id', { length: 255 }).references(() => users_table.id),

    sort_order: integer('sort_order').default(0).notNull(),

    vehicle_price: numeric('vehicle_price'),
    trade_in_value: numeric('trade_in_value'),
    discount: numeric('discount'),
    negotiation_value: numeric('negotiation_value'),

    loss_reason: varchar('loss_reason', { length: 500 }),

    won_at: timestamp('won_at', { withTimezone: true, mode: 'string' }),
    lost_at: timestamp('lost_at', { withTimezone: true, mode: 'string' }),
    client_created_at: timestamp('client_created_at', { withTimezone: true, mode: 'string' }),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  table => [
    index('idx_negotiations_workspace').on(table.workspace_id),
    index('idx_negotiations_client').on(table.client_id),
    index('idx_negotiations_branch').on(table.branch_id),
    index('idx_negotiations_pipeline_step').on(table.workspace_id, table.pipeline_id, table.step_id),
    index('idx_negotiations_assignee').on(table.assignee_id),
  ]
);

// ─── Vehicles (veículos — inventory/stock per branch; also trade-in vehicles) ──
// category generalises the fleet (motorcycle today, car/truck tomorrow).
// source = stock (dealer inventory) | trade_in (customer-owned, owner_client_id set).
export const vehicles_table = schema.table(
  'vehicles',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 })
      .notNull()
      .references(() => workspaces_table.id),
    branch_id: varchar('branch_id', { length: 255 }).references(() => branches_table.id),
    owner_client_id: varchar('owner_client_id', { length: 255 }).references(() => clients_table.id),

    category: varchar('category', { length: 20 }).default('motorcycle').notNull(),
    make: varchar('make', { length: 100 }).notNull(),
    model: varchar('model', { length: 150 }).notNull(),
    version: varchar('version', { length: 150 }),
    model_year: integer('model_year'),
    manufacture_year: integer('manufacture_year'),
    color: varchar('color', { length: 50 }),
    mileage: integer('mileage'),

    plate: varchar('plate', { length: 10 }),
    chassi: varchar('chassi', { length: 17 }),
    renavam: varchar('renavam', { length: 20 }),

    fuel_type: varchar('fuel_type', { length: 30 }),
    transmission: varchar('transmission', { length: 30 }),

    price: numeric('price'),
    cost: numeric('cost'),
    status: varchar('status', { length: 30 }).default('available').notNull(),
    source: varchar('source', { length: 20 }).default('stock').notNull(),

    photos: jsonb('photos'),
    client_created_at: timestamp('client_created_at', { withTimezone: true, mode: 'string' }),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  table => [
    index('idx_vehicles_workspace').on(table.workspace_id),
    index('idx_vehicles_branch').on(table.branch_id),
    index('idx_vehicles_status').on(table.workspace_id, table.status),
    index('idx_vehicles_owner_client').on(table.owner_client_id),
    uniqueIndex('uq_vehicle_workspace_plate')
      .on(table.workspace_id, table.plate)
      .where(sql`plate IS NOT NULL AND deleted_at IS NULL`),
    uniqueIndex('uq_vehicle_workspace_chassi')
      .on(table.workspace_id, table.chassi)
      .where(sql`chassi IS NOT NULL AND deleted_at IS NULL`),
  ]
);

// ─── Negotiation × Vehicle junction ───────────────────────────────────────────
// A deal may involve a vehicle of interest AND a trade-in (role distinguishes).
// Surrogate id (not composite) so BaseRepository.findById/update/deleteById work.
export const negotiation_vehicles = schema.table(
  'negotiation_vehicles',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 })
      .notNull()
      .references(() => workspaces_table.id),
    negotiation_id: varchar('negotiation_id', { length: 255 })
      .notNull()
      .references(() => negotiations_table.id),
    vehicle_id: varchar('vehicle_id', { length: 255 })
      .notNull()
      .references(() => vehicles_table.id),

    // interest = vehicle the client wants to buy | trade_in = used vehicle given as payment
    role: varchar('role', { length: 20 }).notNull(),
    amount: numeric('amount'),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  table => [
    index('idx_negveh_negotiation').on(table.negotiation_id),
    index('idx_negveh_vehicle').on(table.vehicle_id),
    index('idx_negveh_workspace').on(table.workspace_id),
    uniqueIndex('uq_negveh_negotiation_vehicle_role')
      .on(table.negotiation_id, table.vehicle_id, table.role)
      .where(sql`deleted_at IS NULL`),
  ]
);
