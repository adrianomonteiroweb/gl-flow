import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <div className="flex-shrink-0 border-b">
    <div className="container mx-auto px-4 py-5">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-base font-semibold md:text-lg">{title}</h2>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
        {actions && <div className="flex items-center space-x-2">{actions}</div>}
      </div>
    </div>
  </div>
);
