-- Create initial negotiations (deals) in "Prospecção" step for existing clients without negotiations
INSERT INTO "linharesflow"."negotiations" (
  "id",
  "workspace_id",
  "client_id",
  "branch_id",
  "title",
  "pipeline_id",
  "step_id",
  "status_id",
  "assignee_id",
  "sort_order",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  c.workspace_id,
  c.id,
  c.branch_id,
  c.name,
  p.id,
  s.id,
  st.id,
  c.assignee_id,
  0,
  c.created_at,
  c.updated_at
FROM "linharesflow"."clients" c
INNER JOIN "linharesflow"."pipelines" p
  ON p.workspace_id = c.workspace_id
  AND p.is_default = true
  AND p.deleted_at IS NULL
INNER JOIN "linharesflow"."steps" s
  ON s.workspace_id = c.workspace_id
  AND s.slug = 'prospeccao'
  AND s.deleted_at IS NULL
INNER JOIN "linharesflow"."status" st
  ON st.workspace_id = c.workspace_id
  AND st.slug = 'novo'
  AND st.deleted_at IS NULL
LEFT JOIN "linharesflow"."negotiations" n
  ON n.client_id = c.id
  AND n.deleted_at IS NULL
WHERE c.deleted_at IS NULL
  AND n.id IS NULL
ON CONFLICT DO NOTHING;
