import { sql } from 'drizzle-orm';
import { numeric, primaryKey, boolean, smallint, integer, unique, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { pgSchema, varchar, jsonb, timestamp, text } from 'drizzle-orm/pg-core';

export const schema = pgSchema('glflow');

// ─── Workspaces (must be first — referenced by users, leads, chats) ───────────
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

    address: jsonb('address'),
    loss_reason: varchar('loss_reason', { length: 500 }),

    status: varchar('status', { length: 50 }).default('active').notNull(),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  table => [
    index('idx_leads_phone').on(table.phone),
    index('idx_leads_workspace').on(table.workspace_id),
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

// ─── Chats ────────────────────────────────────────────────────────────────────
// conv_state values: AWAITING_NAME | AWAITING_ADDRESS_ZIP | AWAITING_ADDRESS_STREET | AWAITING_ADDRESS_NUMBER
//                    AWAITING_ADDRESS_CONFIRMATION | AWAITING_PLAN_SELECTION
//                    QUALIFIED | BOT_PAUSED | INACTIVE | CLOSED
// conv_state is null for chats created before the conversation engine was introduced.
// The engine treats null as a pass-through (no state tracking).
export const chats_table = schema.table(
  'chats',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    lead_id: varchar('lead_id', { length: 255 }).notNull(),
    assignee_id: varchar('assignee_id', { length: 255 }).references(() => users_table.id),

    workspace_id: varchar('workspace_id', { length: 255 }).references(() => workspaces_table.id),

    title: varchar('title', { length: 255 }),
    step: varchar('step', { length: 50 })
      .default('new')
      .references(() => steps_table.id),
    status: varchar('status', { length: 50 })
      .default('pending')
      .notNull()
      .references(() => status_table.id),

    pipeline_id: varchar('pipeline_id', { length: 255 }).references(() => pipelines_table.id),

    // Conversation state machine — null means legacy chat (no state tracking)
    conv_state: varchar('conv_state', { length: 50 }),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    done_at: timestamp('done_at', { withTimezone: true, mode: 'string' }),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    // Prevents two concurrent active chats for the same lead+workspace pair.
    // NULL workspace_id is treated as distinct by PostgreSQL (NULL != NULL),
    // so this only fully protects records with a non-null workspace_id.
    uniqueIndex('uq_active_chat_per_lead')
      .on(table.lead_id, table.workspace_id)
      .where(sql`"done_at" IS NULL`),
    index('idx_chats_workspace').on(table.workspace_id),
    index('idx_chats_lead').on(table.lead_id),
    index('idx_chats_conv_state').on(table.conv_state),
    index('idx_chats_pipeline').on(table.pipeline_id),
  ]
);

// ─── Scheduled Messages (follow-ups) ─────────────────────────────────────────
export const chat_scheduled_messages_table = schema.table(
  'chat_scheduled_messages',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    chat_id: varchar('chat_id', { length: 255 })
      .notNull()
      .references(() => chats_table.id),

    // Step in the sequence: 1=15min, 2=2h, 3=24h, 4=72h, 5=7d
    step_order: smallint('step_order').notNull(),

    // Channel — same values as messages_table.origin
    origin: varchar('origin', { length: 50 }).notNull(),

    scheduled_at: timestamp('scheduled_at', { withTimezone: true, mode: 'string' }).notNull(),

    // 'pending' | 'processing' | 'sent' | 'cancelled' | 'failed'
    status: varchar('status', { length: 50 }).default('pending').notNull(),

    // Which flow config step this was scheduled from
    flow_name: varchar('flow_name', { length: 100 }).default('onboarding'),

    // The conversation state that triggered this scheduled message
    trigger_state: varchar('trigger_state', { length: 50 }),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    unique('uq_chat_scheduled_message_step').on(table.chat_id, table.step_order),
    index('idx_chat_scheduled_messages_pending').on(table.scheduled_at),
    index('idx_chat_scheduled_messages_chat_status').on(table.chat_id, table.status),
  ]
);

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messages_table = schema.table(
  'messages',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    chat_id: varchar('chat_id', { length: 255 })
      .notNull()
      .references(() => chats_table.id),

    sender: jsonb('sender').notNull(), // { id: string, type: 'user' | 'lead', name: string }

    type: varchar('type', { length: 50 }), // e.g. 'text', 'image', 'file', etc.
    origin: varchar('origin', { length: 50 }), // e.g. 'web', 'email', 'sms', 'whatsapp', 'instagram', etc.

    content: text('content').notNull(),
    react: jsonb('react'), // { type: 'like' | 'dislike' | 'laugh' | 'sad' | 'angry', user_id: string }

    payload: jsonb('payload'),
    metadata: jsonb('metadata'), // { wa_message_id?: string, caption?: string, ... }

    sent_at: timestamp('sent_at', { withTimezone: true, mode: 'string' }),
    viewed_at: timestamp('viewed_at', { withTimezone: true, mode: 'string' }),
    received_at: timestamp('received_at', { withTimezone: true, mode: 'string' }),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    // Prevents duplicate messages from Meta webhook retries.
    uniqueIndex('uq_messages_wa_message_id')
      .on(sql`(metadata->>'wa_message_id')`)
      .where(sql`metadata->>'wa_message_id' IS NOT NULL`),
  ]
);

// ─── WhatsApp Numbers (multi-number per workspace) ────────────────────────────
export const wa_numbers_table = schema.table(
  'wa_numbers',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 })
      .notNull()
      .references(() => workspaces_table.id),

    // The phone_number_id from Meta (appears in every webhook payload)
    phone_number_id: varchar('phone_number_id', { length: 100 }).unique().notNull(),

    // Human-readable number: e.g. "+55 85 99999-9999"
    display_number: varchar('display_number', { length: 50 }).notNull(),

    // WhatsApp Cloud API credentials for this specific number
    access_token: text('access_token').notNull(),
    app_secret: varchar('app_secret', { length: 255 }),
    verify_token: varchar('verify_token', { length: 255 }),

    is_active: boolean('is_active').default(true).notNull(),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  table => [index('idx_wa_numbers_workspace').on(table.workspace_id)]
);

// ─── Flow Configs ─────────────────────────────────────────────────────────────
// Stores per-workspace flow configuration for the conversation automation engine.
//
// config JSONB structure:
// {
//   steps: Array<{
//     order: number;           // 1, 2, 3, 4, 5
//     delay_ms: number;        // delay in milliseconds
//     trigger_state: string;   // conv_state that triggers this follow-up
//     message: string | null;  // free text message (used within 24h window)
//     template_name: string | null; // wa_templates.name (used outside 24h window)
//     cancel_on_states: string[];   // conv_states that cancel this step
//   }>
// }
export const flow_configs_table = schema.table(
  'flow_configs',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 })
      .notNull()
      .references(() => workspaces_table.id),

    // "onboarding" | "nurturing" | "reengagement"
    flow_name: varchar('flow_name', { length: 100 }).notNull(),

    is_active: boolean('is_active').default(true).notNull(),

    config: jsonb('config').notNull(),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    unique('uq_flow_config_workspace_name').on(table.workspace_id, table.flow_name),
    index('idx_flow_configs_workspace').on(table.workspace_id),
  ]
);

// ─── Automation Logs (append-only audit trail) ────────────────────────────────
// Records every meaningful event in the automation engine for auditability and observability.
// Never update rows in this table — only insert.
//
// event_type values:
//   STATE_TRANSITION  — conv_state changed
//   MESSAGE_SENT      — automated message was sent
//   FOLLOWUP_SCHEDULED — a follow-up was scheduled
//   FOLLOWUP_CANCELLED — a follow-up was cancelled
//   HANDOFF_START     — human agent took over (bot paused)
//   HANDOFF_END       — bot resumed after human handoff
//   FLOW_ERROR        — an error occurred in the automation engine
export const automation_logs_table = schema.table(
  'automation_logs',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 }),
    chat_id: varchar('chat_id', { length: 255 })
      .notNull()
      .references(() => chats_table.id),
    lead_id: varchar('lead_id', { length: 255 }),

    event_type: varchar('event_type', { length: 100 }).notNull(),
    from_state: varchar('from_state', { length: 50 }),
    to_state: varchar('to_state', { length: 50 }),
    channel: varchar('channel', { length: 50 }),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('idx_automation_logs_chat').on(table.chat_id),
    index('idx_automation_logs_workspace_created').on(table.workspace_id, table.created_at),
    index('idx_automation_logs_event_type').on(table.event_type),
  ]
);

// ─── Lead Activities (append-only timeline / lead history) ────────────────────
// Records every business milestone for a lead: creation (with origin), info /
// address / loss-reason updates, kanban status & step changes, assignment, tasks,
// proposals and manual notes. Append-only (INSERT only) for an auditable history.
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
    chat_id: varchar('chat_id', { length: 255 }),

    // type values: lead_created | info_updated | address_updated | loss_reason_set
    //              loss_reason_cleared | status_changed | step_changed | assignee_changed
    //              chat_won | chat_closed | task_created | task_completed | task_reopened
    //              task_deleted | proposal_created | note_added
    type: varchar('type', { length: 50 }).notNull(),

    // actor_type values: user | bot | lead | system
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

export const products_table = schema.table(
  'products',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 })
      .notNull()
      .references(() => workspaces_table.id),

    code: varchar('code', { length: 100 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    type: varchar('type', { length: 50 }).notNull(),
    category: varchar('category', { length: 100 }),

    base_price: numeric('base_price', { precision: 10, scale: 2 }),

    is_loyalty: boolean('is_loyalty').default(false).notNull(),
    loyalty_months: integer('loyalty_months'),
    loyalty_price: numeric('loyalty_price', { precision: 10, scale: 2 }),

    specs: jsonb('specs'),
    benefits: jsonb('benefits'),
    coverage_cities: jsonb('coverage_cities'),

    payment_method: varchar('payment_method', { length: 100 }),

    status: varchar('status', { length: 50 }).default('active').notNull(),
    is_visible: boolean('is_visible').default(true).notNull(),
    sort_order: integer('sort_order').default(0).notNull(),

    source: varchar('source', { length: 50 }).default('manual').notNull(),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  table => [
    unique('uq_product_workspace_code').on(table.workspace_id, table.code),
    index('idx_products_workspace_status').on(table.workspace_id, table.status),
    index('idx_products_workspace_type_status').on(table.workspace_id, table.type, table.status),
    index('idx_products_workspace_source').on(table.workspace_id, table.source),
  ]
);

export const product_external_refs_table = schema.table(
  'product_external_refs',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    product_id: varchar('product_id', { length: 255 })
      .notNull()
      .references(() => products_table.id),

    workspace_id: varchar('workspace_id', { length: 255 })
      .notNull()
      .references(() => workspaces_table.id),

    provider: varchar('provider', { length: 50 }).notNull(),
    external_id: varchar('external_id', { length: 255 }).notNull(),
    external_code: varchar('external_code', { length: 255 }),
    external_data: jsonb('external_data'),

    synced_at: timestamp('synced_at', { withTimezone: true, mode: 'string' }),
    sync_status: varchar('sync_status', { length: 50 }).default('synced').notNull(),
    sync_error: text('sync_error'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    unique('uq_external_ref_provider').on(table.workspace_id, table.provider, table.external_id),
    index('idx_external_refs_product').on(table.product_id),
    index('idx_external_refs_sync').on(table.workspace_id, table.provider, table.sync_status),
  ]
);

// ─── Loss Reasons ────────────────────────────────────────────────────────────
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
  table => [index('idx_loss_reasons_workspace').on(table.workspace_id), unique('uq_loss_reason_workspace_name').on(table.workspace_id, table.name)]
);

export const quick_messages_table = schema.table('quick_messages', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }),

  order: numeric('order').default('0').notNull(),
  is_active: boolean('is_active').default(true).notNull(),

  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

// ─── Proposal Templates (modelos de proposta/contrato/termo) ───────────────────
// content stores Tiptap HTML with {{NAMESPACE.FIELD}} variable tokens.
export const proposal_templates_table = schema.table(
  'proposal_templates',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 }).references(() => workspaces_table.id),

    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 500 }),

    // 'proposta' | 'contrato' | 'termo'
    category: varchar('category', { length: 50 }).default('proposta').notNull(),

    content: text('content').notNull(),

    is_active: boolean('is_active').default(true).notNull(),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  table => [index('idx_proposal_templates_workspace').on(table.workspace_id)]
);

// ─── Proposal Documents (documentos gerados por lead — histórico) ──────────────
// content stores the FINAL resolved HTML snapshot so it can be reprinted exactly.
export const proposal_documents_table = schema.table(
  'proposal_documents',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 }).references(() => workspaces_table.id),

    lead_id: varchar('lead_id', { length: 255 })
      .notNull()
      .references(() => leads_table.id),

    chat_id: varchar('chat_id', { length: 255 }).references(() => chats_table.id),
    template_id: varchar('template_id', { length: 255 }).references(() => proposal_templates_table.id),
    created_by: varchar('created_by', { length: 255 }).references(() => users_table.id),

    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),

    // 'draft' | 'generated'
    status: varchar('status', { length: 50 }).default('draft').notNull(),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  table => [index('idx_proposal_documents_lead').on(table.lead_id), index('idx_proposal_documents_workspace').on(table.workspace_id)]
);

// ─── Tasks (tarefas vinculadas a leads) ──────────────────────────────────────
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
  },
  table => [
    index('idx_tasks_lead').on(table.lead_id),
    index('idx_tasks_workspace').on(table.workspace_id),
    index('idx_tasks_assignee').on(table.assignee_id),
  ]
);

// ─── Teams ───────────────────────────────────────────────────────────────────
export const teams_table = schema.table(
  'teams',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 })
      .notNull()
      .references(() => workspaces_table.id),

    name: varchar('name', { length: 255 }).notNull(),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  table => [
    index('idx_teams_workspace').on(table.workspace_id),
    uniqueIndex('uq_team_workspace_name')
      .on(table.workspace_id, table.name)
      .where(sql`deleted_at IS NULL`),
  ]
);

// ─── Team × Members junction ─────────────────────────────────────────────────
export const team_members_table = schema.table(
  'team_members',
  {
    team_id: varchar('team_id', { length: 255 })
      .notNull()
      .references(() => teams_table.id),
    user_id: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users_table.id),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  table => [primaryKey(table.team_id, table.user_id), index('idx_team_members_user').on(table.user_id)]
);

// ─── Team × Pipelines junction ───────────────────────────────────────────────
export const team_pipelines_table = schema.table(
  'team_pipelines',
  {
    team_id: varchar('team_id', { length: 255 })
      .notNull()
      .references(() => teams_table.id),
    pipeline_id: varchar('pipeline_id', { length: 255 })
      .notNull()
      .references(() => pipelines_table.id),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  table => [primaryKey(table.team_id, table.pipeline_id), index('idx_team_pipelines_pipeline').on(table.pipeline_id)]
);

// ─── Workspace Integrations (generic per-workspace app connections) ───────────
// One row per (workspace, provider). Reused by every "Apps e Integrações" app.
//
//   provider     — registry key, e.g. 'voalle'
//   status       — 'disconnected' | 'connected' | 'error' | 'syncing'
//   credentials  — AES-256-GCM ciphertext of JSON.stringify(creds) (encryptToken). NEVER plaintext.
//   config       — non-secret settings (sync cadence, feature flags)
//   last_sync_*  — snapshot of the most recent sync (result = { created, updated, removed, errors })
export const workspace_integrations_table = schema.table(
  'workspace_integrations',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: varchar('workspace_id', { length: 255 })
      .notNull()
      .references(() => workspaces_table.id),

    provider: varchar('provider', { length: 50 }).notNull(),

    enabled: boolean('enabled').default(false).notNull(),

    status: varchar('status', { length: 50 }).default('disconnected').notNull(),

    credentials: text('credentials'),

    config: jsonb('config'),

    last_sync_at: timestamp('last_sync_at', { withTimezone: true, mode: 'string' }),
    last_sync_result: jsonb('last_sync_result'),

    last_error: text('last_error'),
    last_error_at: timestamp('last_error_at', { withTimezone: true, mode: 'string' }),

    payload: jsonb('payload'),
    metadata: jsonb('metadata'),

    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    unique('uq_workspace_integration_provider').on(table.workspace_id, table.provider),
    index('idx_workspace_integrations_workspace').on(table.workspace_id),
  ]
);
