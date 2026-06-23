export interface PipelineStatus {
  id: string;
  name: string;
  slug: string | null;
  is_system: boolean;
  is_universal: boolean;
  is_active: boolean;
  color: string | null;
}

export interface PipelineStage {
  id: string;
  name: string;
  slug: string | null;
  order: string;
  color: string | null;
  is_system: boolean;
  is_active: boolean;
  pipeline_id: string;
  statuses: PipelineStatus[];
  chatCount: number;
}

export interface Pipeline {
  id: string;
  name: string;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
}
