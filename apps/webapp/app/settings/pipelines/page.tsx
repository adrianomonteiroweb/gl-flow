'use client';

import { PageInset } from '@/components/commons/page-inset';
import { PipelineEditor } from '@/components/pipelines/pipeline-editor';
import { SettingsGuard } from '@/components/auth/settings-guard';

export default function PipelinesPage() {
  return (
    <SettingsGuard>
      <PageInset title="Pipelines e Etapas">
        <div className="w-full px-4 py-8">
          <PipelineEditor />
        </div>
      </PageInset>
    </SettingsGuard>
  );
}
