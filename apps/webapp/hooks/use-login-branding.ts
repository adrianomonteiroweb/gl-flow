'use client';

import { useEffect, useState } from 'react';

import { readCachedBranding } from '@/components/commons/loading';
import { normalizeBrandColors, getReadableTextColor } from '@/lib/company/brand-colors';

export type LoginBranding = {
  logoUrl: string | null;
  companyName: string | null;
  primaryColor: string;
  primaryForeground: string;
  hasCustomBranding: boolean;
  useLogoColors: boolean;
};

const DEFAULT_BRANDING: LoginBranding = {
  logoUrl: null,
  companyName: null,
  primaryColor: '',
  primaryForeground: '',
  hasCustomBranding: false,
  useLogoColors: false,
};

export const useLoginBranding = (): LoginBranding => {
  const [branding, setBranding] = useState<LoginBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    const cached = readCachedBranding();
    if (!cached) {
      return;
    }

    const hasLogo = Boolean(cached.logoUrl);
    const hasName = Boolean(cached.companyName);

    if (!hasLogo && !hasName) {
      return;
    }

    const useColors = Boolean(cached.useLogoColors && cached.brandColors);
    const colors = normalizeBrandColors(cached.brandColors);

    setBranding({
      logoUrl: cached.logoUrl || null,
      companyName: cached.companyName || null,
      primaryColor: colors.primary,
      primaryForeground: getReadableTextColor(colors.primary),
      hasCustomBranding: true,
      useLogoColors: useColors,
    });
  }, []);

  return branding;
};
