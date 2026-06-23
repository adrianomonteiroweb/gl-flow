'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

import { useSessionContext } from '@/contexts/session';
import { BRAND_THEME_VARIABLES, buildBrandThemeVariables, normalizeBrandColors } from '@/lib/company/brand-colors';

export const CompanyBrandTheme = () => {
  const { companyProfile } = useSessionContext();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;

    BRAND_THEME_VARIABLES.forEach(variable => {
      root.style.removeProperty(variable);
    });

    if (!companyProfile?.useLogoColors) {
      return;
    }

    const brandColors = normalizeBrandColors(companyProfile.brandColors);
    const mode = resolvedTheme === 'dark' ? 'dark' : 'light';
    const variables = buildBrandThemeVariables(brandColors, mode);

    Object.entries(variables).forEach(([variable, value]) => {
      root.style.setProperty(variable, value);
    });

    return () => {
      BRAND_THEME_VARIABLES.forEach(variable => {
        root.style.removeProperty(variable);
      });
    };
  }, [companyProfile, resolvedTheme]);

  return null;
};
