CREATE SCHEMA "linharesflow";
--> statement-breakpoint
CREATE TABLE "linharesflow"."lead_activities" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(255),
	"lead_id" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" varchar(255),
	"actor_name" varchar(255),
	"description" text,
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "linharesflow"."leads" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"workspace_id" varchar(255),
	"pipeline_id" varchar(255),
	"step_id" varchar(255),
	"status_id" varchar(255),
	"assignee_id" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"address" jsonb,
	"loss_reason" varchar(500),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"won_at" timestamp with time zone,
	"lost_at" timestamp with time zone,
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "linharesflow"."pipelines" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "linharesflow"."status" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"slug" varchar(100),
	"is_universal" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"color" varchar(30),
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "linharesflow"."step_statuses" (
	"step_id" varchar(255) NOT NULL,
	"status_id" varchar(255) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"color" varchar(30),
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "step_statuses_step_id_status_id_pk" PRIMARY KEY("step_id","status_id")
);
--> statement-breakpoint
CREATE TABLE "linharesflow"."steps" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" varchar(255),
	"workspace_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"slug" varchar(100),
	"order" numeric DEFAULT '0' NOT NULL,
	"color" varchar(30),
	"is_post_sale" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "linharesflow"."users" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password" varchar(255),
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"workspace_id" varchar(255),
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "linharesflow"."workspaces" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "linharesflow"."lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "linharesflow"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."leads" ADD CONSTRAINT "leads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "linharesflow"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."leads" ADD CONSTRAINT "leads_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "linharesflow"."pipelines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."leads" ADD CONSTRAINT "leads_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "linharesflow"."steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."leads" ADD CONSTRAINT "leads_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "linharesflow"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."leads" ADD CONSTRAINT "leads_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "linharesflow"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."pipelines" ADD CONSTRAINT "pipelines_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "linharesflow"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."status" ADD CONSTRAINT "status_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "linharesflow"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."step_statuses" ADD CONSTRAINT "step_statuses_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "linharesflow"."steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."step_statuses" ADD CONSTRAINT "step_statuses_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "linharesflow"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."steps" ADD CONSTRAINT "steps_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "linharesflow"."pipelines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."steps" ADD CONSTRAINT "steps_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "linharesflow"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."users" ADD CONSTRAINT "users_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "linharesflow"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_lead_activities_lead" ON "linharesflow"."lead_activities" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_lead_activities_ws_created" ON "linharesflow"."lead_activities" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_leads_phone" ON "linharesflow"."leads" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_leads_workspace" ON "linharesflow"."leads" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_leads_pipeline_step" ON "linharesflow"."leads" USING btree ("workspace_id","pipeline_id","step_id");--> statement-breakpoint
CREATE INDEX "idx_leads_assignee" ON "linharesflow"."leads" USING btree ("assignee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_lead_phone_workspace" ON "linharesflow"."leads" USING btree ("phone","workspace_id") WHERE phone IS NOT NULL AND workspace_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_pipelines_workspace" ON "linharesflow"."pipelines" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pipeline_workspace_name" ON "linharesflow"."pipelines" USING btree ("workspace_id","name") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_status_workspace" ON "linharesflow"."status" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_steps_workspace_pipeline" ON "linharesflow"."steps" USING btree ("workspace_id","pipeline_id");