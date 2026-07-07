import type { ReactNode } from 'react';

interface WizardFooterProps {
  left?: ReactNode;
  right?: ReactNode;
}

export const WizardFooter = ({ left, right }: WizardFooterProps) => (
  <div className="sticky bottom-0 z-10 -mx-6 mt-4 flex flex-col-reverse gap-2 border-t bg-background px-6 py-2 sm:static sm:mx-0 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:bg-transparent sm:px-0 sm:py-0 sm:pt-6">
    <div className="flex gap-2">{left}</div>
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">{right}</div>
  </div>
);
