CREATE TABLE "linharesflow"."vehicle_models" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(255) NOT NULL,
	"make" varchar(100) DEFAULT 'Honda' NOT NULL,
	"model" varchar(150) NOT NULL,
	"version" varchar(150),
	"segment" varchar(20) NOT NULL,
	"model_year" integer,
	"manufacture_year" integer,
	"price" numeric NOT NULL,
	"image_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "linharesflow"."negotiations" ADD COLUMN "vehicle_model_id" varchar(255);--> statement-breakpoint
ALTER TABLE "linharesflow"."vehicle_models" ADD CONSTRAINT "vehicle_models_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "linharesflow"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_vehicle_models_workspace" ON "linharesflow"."vehicle_models" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_vehicle_models_segment" ON "linharesflow"."vehicle_models" USING btree ("workspace_id","segment");--> statement-breakpoint
CREATE INDEX "idx_vehicle_models_active" ON "linharesflow"."vehicle_models" USING btree ("workspace_id","is_active");--> statement-breakpoint
ALTER TABLE "linharesflow"."negotiations" ADD CONSTRAINT "negotiations_vehicle_model_id_vehicle_models_id_fk" FOREIGN KEY ("vehicle_model_id") REFERENCES "linharesflow"."vehicle_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_negotiations_vehicle_model" ON "linharesflow"."negotiations" USING btree ("vehicle_model_id");