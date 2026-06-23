import { DEFAULT_COMPANY_BRAND_COLORS, type CompanyBrandColors } from './profile';

export type ThemeMode = 'light' | 'dark';
export type RgbColor = [number, number, number];
export type HslColor = { h: number; s: number; l: number };

export const normalizeHexColor = (value: string): string => {
  const trimmedValue = value.trim();

  if (/^#[0-9a-fA-F]{3}$/.test(trimmedValue)) {
    const [, r, g, b] = trimmedValue;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  if (/^#[0-9a-fA-F]{6}$/.test(trimmedValue)) {
    return trimmedValue.toUpperCase();
  }

  return '';
};

export const isHexColor = (value: string): boolean => Boolean(normalizeHexColor(value));

export const hexToRgb = (hexColor: string): RgbColor | null => {
  const normalizedColor = normalizeHexColor(hexColor);

  if (!normalizedColor) {
    return null;
  }

  return [
    Number.parseInt(normalizedColor.slice(1, 3), 16),
    Number.parseInt(normalizedColor.slice(3, 5), 16),
    Number.parseInt(normalizedColor.slice(5, 7), 16),
  ];
};

const toHexChannel = (value: number): string => {
  const clamped = Math.min(255, Math.max(0, Math.round(value)));
  return clamped.toString(16).padStart(2, '0');
};

export const rgbToHex = ([red, green, blue]: RgbColor): string =>
  `#${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}`.toUpperCase();

export const rgbToHsl = ([red, green, blue]: RgbColor): HslColor => {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: lightness };
  }

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  hue *= 60;

  if (hue < 0) {
    hue += 360;
  }

  return { h: hue, s: saturation, l: lightness };
};

export const hslToRgb = ({ h, s, l }: HslColor): RgbColor => {
  if (s === 0) {
    const value = Math.round(l * 255);
    return [value, value, value];
  }

  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const huePrime = h / 60;
  const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = l - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime < 1) {
    red = chroma;
    green = secondary;
  } else if (huePrime < 2) {
    red = secondary;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = secondary;
  } else if (huePrime < 4) {
    green = secondary;
    blue = chroma;
  } else if (huePrime < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  return [Math.round((red + match) * 255), Math.round((green + match) * 255), Math.round((blue + match) * 255)];
};

const hexToHsl = (hexColor: string): HslColor | null => {
  const rgb = hexToRgb(hexColor);
  return rgb ? rgbToHsl(rgb) : null;
};

const hslToHex = (hsl: HslColor): string => rgbToHex(hslToRgb(hsl));

/** Sets the lightness of a color while keeping its hue and saturation. */
export const withLightness = (hexColor: string, lightness: number): string => {
  const hsl = hexToHsl(hexColor);

  if (!hsl) {
    return hexColor;
  }

  return hslToHex({ ...hsl, l: lightness });
};

/** Forces the lightness of a color into a [min, max] band, keeping hue/saturation. */
export const clampLightness = (hexColor: string, min: number, max: number): string => {
  const hsl = hexToHsl(hexColor);

  if (!hsl) {
    return hexColor;
  }

  return hslToHex({ ...hsl, l: Math.min(max, Math.max(min, hsl.l)) });
};

export const withAlpha = (hexColor: string, alpha: number): string => {
  const rgb = hexToRgb(hexColor);

  if (!rgb) {
    return hexColor;
  }

  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
};

const channelLuminance = (channel: number): number => {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = ([red, green, blue]: RgbColor): number =>
  0.2126 * channelLuminance(red) + 0.7152 * channelLuminance(green) + 0.0722 * channelLuminance(blue);

/** Picks black or white text for the strongest WCAG contrast against the given background. */
export const getReadableTextColor = (hexColor: string): '#000000' | '#FFFFFF' => {
  const rgb = hexToRgb(hexColor);

  if (!rgb) {
    return '#FFFFFF';
  }

  const luminance = relativeLuminance(rgb);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  const contrastWithWhite = 1.05 / (luminance + 0.05);

  return contrastWithBlack >= contrastWithWhite ? '#000000' : '#FFFFFF';
};

export const normalizeBrandColors = (colors?: Partial<CompanyBrandColors> | null): CompanyBrandColors => ({
  primary: normalizeHexColor(colors?.primary ?? '') || DEFAULT_COMPANY_BRAND_COLORS.primary,
  secondary: normalizeHexColor(colors?.secondary ?? '') || DEFAULT_COMPANY_BRAND_COLORS.secondary,
  accent: normalizeHexColor(colors?.accent ?? '') || DEFAULT_COMPANY_BRAND_COLORS.accent,
});

export const BRAND_THEME_VARIABLES = [
  '--primary',
  '--primary-foreground',
  '--ring',
  '--accent',
  '--accent-foreground',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--sidebar',
  '--sidebar-foreground',
  '--sidebar-muted-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-ring',
] as const;

export type BrandThemeVariable = (typeof BRAND_THEME_VARIABLES)[number];

const derivePrimary = (hexColor: string, mode: ThemeMode): string =>
  mode === 'dark' ? clampLightness(hexColor, 0.55, 0.72) : clampLightness(hexColor, 0.3, 0.6);

const deriveAccent = (hexColor: string, mode: ThemeMode): string =>
  mode === 'dark' ? clampLightness(hexColor, 0.5, 0.72) : clampLightness(hexColor, 0.4, 0.72);

/** A deep, branded surface for the sidebar — keeps the brand hue but stays dark and not neon. */
const toBrandSurface = (hexColor: string, lightness: number): string => {
  const hsl = hexToHsl(hexColor);

  if (!hsl) {
    return hexColor;
  }

  return hslToHex({ h: hsl.h, s: Math.min(hsl.s, 0.55), l: lightness });
};

/**
 * Builds the full set of theme CSS variables derived from the brand palette,
 * tuned for the active light/dark mode so contrast holds in both.
 */
export const buildBrandThemeVariables = (colors: CompanyBrandColors, mode: ThemeMode): Record<BrandThemeVariable, string> => {
  const normalized = normalizeBrandColors(colors);
  const primary = derivePrimary(normalized.primary, mode);
  const accent = deriveAccent(normalized.secondary, mode);
  const support = deriveAccent(normalized.accent, mode);
  const sidebar = toBrandSurface(normalized.primary, mode === 'dark' ? 0.12 : 0.18);
  const sidebarAccent = toBrandSurface(normalized.primary, mode === 'dark' ? 0.22 : 0.28);
  const primaryForeground = getReadableTextColor(primary);
  const accentForeground = getReadableTextColor(accent);
  const sidebarForeground = getReadableTextColor(sidebar);
  const sidebarAccentForeground = getReadableTextColor(sidebarAccent);

  return {
    '--primary': primary,
    '--primary-foreground': primaryForeground,
    '--ring': primary,
    '--accent': accent,
    '--accent-foreground': accentForeground,
    '--chart-1': primary,
    '--chart-2': accent,
    '--chart-3': support,
    '--sidebar': sidebar,
    '--sidebar-foreground': sidebarForeground,
    '--sidebar-muted-foreground': withAlpha(sidebarForeground, 0.72),
    '--sidebar-primary': primary,
    '--sidebar-primary-foreground': primaryForeground,
    '--sidebar-accent': sidebarAccent,
    '--sidebar-accent-foreground': sidebarAccentForeground,
    '--sidebar-ring': primary,
  };
};
