export type TeamPipeline = {
  id: string;
  name: string;
};

export type Team = {
  id: string;
  name: string;
  workspace_id: string;
  memberCount: number;
  pipelines: TeamPipeline[];
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  user_id: string;
  name: string;
  email: string;
  role: string | null;
};

export type TeamDetail = {
  id: string;
  name: string;
  workspace_id: string;
  members: TeamMember[];
  pipelines: { pipeline_id: string; name: string }[];
  created_at: string;
  updated_at: string;
};
