'use client';

import { useSidebar } from '@workspace/ui/components/sidebar';
import { useSessionContext } from '@/contexts/session';
import { LogoMark } from '@/components/company/logo-mark';

const getInitials = (value: string): string => {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return 'OB';
  }

  return words
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() ?? '')
    .join('');
};

export function AppLogo() {
  const { state } = useSidebar();
  const { companyProfile } = useSessionContext();
  const displayName = companyProfile?.nomeFantasia || companyProfile?.razaoSocial || 'glflow';

  if (state === 'collapsed') {
    return (
      <div className="flex h-9 items-center justify-center overflow-hidden px-2">
        {companyProfile?.logoUrl ? (
          <LogoMark
            src={companyProfile.logoUrl}
            alt={`Logo ${displayName}`}
            width={32}
            height={28}
            className="h-8 w-8 p-1 shadow-sm"
            imageClassName="max-h-6 max-w-6"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
            {getInitials(displayName)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-10 items-center overflow-hidden px-2">
      {companyProfile?.logoUrl ? (
        <LogoMark
          src={companyProfile.logoUrl}
          alt={`Logo ${displayName}`}
          width={160}
          height={42}
          className="h-8 w-fit max-w-full px-2.5 py-1 shadow-sm"
          imageClassName="max-h-6 w-auto max-w-[150px]"
        />
      ) : (
        <span className="truncate text-sm font-semibold tracking-normal text-sidebar-foreground">{displayName}</span>
      )}
    </div>
  );
}
