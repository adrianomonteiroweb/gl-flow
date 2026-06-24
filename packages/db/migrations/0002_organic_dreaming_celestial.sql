CREATE TABLE "linharesflow"."branches" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"cnpj" varchar(18),
	"phone" varchar(50),
	"email" varchar(255),
	"address" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "linharesflow"."clients" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(255) NOT NULL,
	"branch_id" varchar(255),
	"assignee_id" varchar(255),
	"person_type" varchar(2) DEFAULT 'pf' NOT NULL,
	"name" varchar(255) NOT NULL,
	"trade_name" varchar(255),
	"document" varchar(18),
	"rg" varchar(20),
	"cnh" varchar(20),
	"email" varchar(255),
	"phone" varchar(50),
	"phone_secondary" varchar(50),
	"birth_date" timestamp with time zone,
	"address" jsonb,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"client_created_at" timestamp with time zone,
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "linharesflow"."negotiation_vehicles" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(255) NOT NULL,
	"negotiation_id" varchar(255) NOT NULL,
	"vehicle_id" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"amount" numeric,
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "linharesflow"."negotiations" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(255) NOT NULL,
	"client_id" varchar(255),
	"branch_id" varchar(255),
	"title" varchar(255),
	"pipeline_id" varchar(255),
	"step_id" varchar(255),
	"status_id" varchar(255),
	"assignee_id" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"vehicle_price" numeric,
	"trade_in_value" numeric,
	"discount" numeric,
	"negotiation_value" numeric,
	"loss_reason" varchar(500),
	"won_at" timestamp with time zone,
	"lost_at" timestamp with time zone,
	"client_created_at" timestamp with time zone,
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "linharesflow"."vehicles" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(255) NOT NULL,
	"branch_id" varchar(255),
	"owner_client_id" varchar(255),
	"category" varchar(20) DEFAULT 'motorcycle' NOT NULL,
	"make" varchar(100) NOT NULL,
	"model" varchar(150) NOT NULL,
	"version" varchar(150),
	"model_year" integer,
	"manufacture_year" integer,
	"color" varchar(50),
	"mileage" integer,
	"plate" varchar(10),
	"chassi" varchar(17),
	"renavam" varchar(20),
	"fuel_type" varchar(30),
	"transmission" varchar(30),
	"price" numeric,
	"cost" numeric,
	"status" varchar(30) DEFAULT 'available' NOT NULL,
	"source" varchar(20) DEFAULT 'stock' NOT NULL,
	"photos" jsonb,
	"client_created_at" timestamp with time zone,
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "linharesflow"."users" ADD COLUMN "branch_id" varchar(255);--> statement-breakpoint
ALTER TABLE "linharesflow"."branches" ADD CONSTRAINT "branches_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "linharesflow"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."clients" ADD CONSTRAINT "clients_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "linharesflow"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."clients" ADD CONSTRAINT "clients_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "linharesflow"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."clients" ADD CONSTRAINT "clients_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "linharesflow"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."negotiation_vehicles" ADD CONSTRAINT "negotiation_vehicles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "linharesflow"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."negotiation_vehicles" ADD CONSTRAINT "negotiation_vehicles_negotiation_id_negotiations_id_fk" FOREIGN KEY ("negotiation_id") REFERENCES "linharesflow"."negotiations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."negotiation_vehicles" ADD CONSTRAINT "negotiation_vehicles_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "linharesflow"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."negotiations" ADD CONSTRAINT "negotiations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "linharesflow"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."negotiations" ADD CONSTRAINT "negotiations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "linharesflow"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."negotiations" ADD CONSTRAINT "negotiations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "linharesflow"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."negotiations" ADD CONSTRAINT "negotiations_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "linharesflow"."pipelines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."negotiations" ADD CONSTRAINT "negotiations_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "linharesflow"."steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."negotiations" ADD CONSTRAINT "negotiations_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "linharesflow"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."negotiations" ADD CONSTRAINT "negotiations_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "linharesflow"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."vehicles" ADD CONSTRAINT "vehicles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "linharesflow"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."vehicles" ADD CONSTRAINT "vehicles_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "linharesflow"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linharesflow"."vehicles" ADD CONSTRAINT "vehicles_owner_client_id_clients_id_fk" FOREIGN KEY ("owner_client_id") REFERENCES "linharesflow"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_branches_workspace" ON "linharesflow"."branches" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_branch_workspace_name" ON "linharesflow"."branches" USING btree ("workspace_id","name") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_branch_workspace_cnpj" ON "linharesflow"."branches" USING btree ("workspace_id","cnpj") WHERE cnpj IS NOT NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_clients_workspace" ON "linharesflow"."clients" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_clients_branch" ON "linharesflow"."clients" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_clients_assignee" ON "linharesflow"."clients" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "idx_clients_phone" ON "linharesflow"."clients" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_client_workspace_document" ON "linharesflow"."clients" USING btree ("workspace_id","document") WHERE document IS NOT NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_client_workspace_phone" ON "linharesflow"."clients" USING btree ("workspace_id","phone") WHERE phone IS NOT NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_negveh_negotiation" ON "linharesflow"."negotiation_vehicles" USING btree ("negotiation_id");--> statement-breakpoint
CREATE INDEX "idx_negveh_vehicle" ON "linharesflow"."negotiation_vehicles" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_negveh_workspace" ON "linharesflow"."negotiation_vehicles" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_negveh_negotiation_vehicle_role" ON "linharesflow"."negotiation_vehicles" USING btree ("negotiation_id","vehicle_id","role") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_negotiations_workspace" ON "linharesflow"."negotiations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_negotiations_client" ON "linharesflow"."negotiations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_negotiations_branch" ON "linharesflow"."negotiations" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_negotiations_pipeline_step" ON "linharesflow"."negotiations" USING btree ("workspace_id","pipeline_id","step_id");--> statement-breakpoint
CREATE INDEX "idx_negotiations_assignee" ON "linharesflow"."negotiations" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "idx_vehicles_workspace" ON "linharesflow"."vehicles" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_vehicles_branch" ON "linharesflow"."vehicles" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_vehicles_status" ON "linharesflow"."vehicles" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "idx_vehicles_owner_client" ON "linharesflow"."vehicles" USING btree ("owner_client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_vehicle_workspace_plate" ON "linharesflow"."vehicles" USING btree ("workspace_id","plate") WHERE plate IS NOT NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_vehicle_workspace_chassi" ON "linharesflow"."vehicles" USING btree ("workspace_id","chassi") WHERE chassi IS NOT NULL AND deleted_at IS NULL;--> statement-breakpoint
ALTER TABLE "linharesflow"."users" ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "linharesflow"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_users_branch" ON "linharesflow"."users" USING btree ("branch_id");