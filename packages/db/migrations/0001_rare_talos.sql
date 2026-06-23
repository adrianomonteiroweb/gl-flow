CREATE TABLE "linharesflow"."loss_reasons" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "linharesflow"."tasks" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(255) NOT NULL,
	"lead_id" varchar(255) NOT NULL,
	"assignee_id" varchar(255),
	"title" varchar(255) NOT NULL,
	"description" text,
	"due_date" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "linharesflow"."loss_reasons" ADD CONSTRAINT "loss_reasons_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "linharesflow"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."tasks" ADD CONSTRAINT "tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "linharesflow"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."tasks" ADD CONSTRAINT "tasks_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "linharesflow"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "linharesflow"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_loss_reasons_workspace" ON "linharesflow"."loss_reasons" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_loss_reason_workspace_name" ON "linharesflow"."loss_reasons" USING btree ("workspace_id","name") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_tasks_lead" ON "linharesflow"."tasks" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_workspace" ON "linharesflow"."tasks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_assignee" ON "linharesflow"."tasks" USING btree ("assignee_id");