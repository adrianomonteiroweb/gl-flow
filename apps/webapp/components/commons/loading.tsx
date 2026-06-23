'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

import type { CompanyBrandColors } from '@/lib/company/profile';

export const BRANDING_CACHE_KEY = 'app:branding';

export type CachedBranding = {
  logoUrl: string;
  companyName: string;
  brandColors?: CompanyBrandColors;
  useLogoColors?: boolean;
};

export const cacheCompanyBranding = (branding: CachedBranding): void => {
  try {
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding));
  } catch {}
};

export const readCachedBranding = (): CachedBranding | null => {
  try {
    const cached = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!cached) {
      return null;
    }
    return JSON.parse(cached) as CachedBranding;
  } catch {
    return null;
  }
};

export function AppLoading() {
  const [branding, setBranding] = useState<CachedBranding | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setBranding(readCachedBranding());
  }, []);

  const renderBrand = (): React.ReactNode => {
    if (branding?.logoUrl && !logoError) {
      return (
        <Image
          src={branding.logoUrl}
          alt={branding.companyName || 'Logo'}
          width={180}
          height={48}
          className="max-h-12 max-w-[180px] object-contain"
          onError={() => setLogoError(true)}
          unoptimized
        />
      );
    }

    if (branding?.companyName) {
      return <span className="text-2xl font-bold text-foreground">{branding.companyName}</span>;
    }
  };

  return <div className="flex h-full w-full items-center justify-center animate-pulse">{renderBrand()}</div>;
}
