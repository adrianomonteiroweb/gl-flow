'use client';

import { useRef, useState } from 'react';
import { ImageIcon, Loader2, Palette, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Switch } from '@workspace/ui/components/switch';
import { DEFAULT_COMPANY_BRAND_COLORS, type CompanyBrandColors, type CompanyProfile } from '@/lib/company/profile';
import { hexToRgb, hslToRgb, normalizeBrandColors, normalizeHexColor, rgbToHex, rgbToHsl, type RgbColor } from '@/lib/company/brand-colors';
import { LogoMark } from '@/components/company/logo-mark';

type CompanyField = keyof CompanyProfile;
type FieldSetter = <K extends CompanyField>(field: K, value: CompanyProfile[K]) => void;
type ColorCandidate = {
  hex: string;
  count: number;
  saturation: number;
  lightness: number;
  hue: number;
};

const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml,.svg';
const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const ALLOWED_LOGO_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const ALLOWED_LOGO_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg']);

const clampValue = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const hueDistance = (first: number, second: number): number => {
  const diff = Math.abs(first - second) % 360;
  return diff > 180 ? 360 - diff : diff;
};

const isUsefulBrandColor = (candidate: ColorCandidate): boolean => candidate.lightness > 0.08 && candidate.lightness < 0.95;

/** A candidate is distinct when it differs in hue (when both are colorful) or clearly in lightness. */
const isDistinctColor = (candidate: ColorCandidate, reference: ColorCandidate): boolean => {
  const lightnessGap = Math.abs(candidate.lightness - reference.lightness);
  const bothColorful = candidate.saturation > 0.15 && reference.saturation > 0.15;

  if (bothColorful) {
    return hueDistance(candidate.hue, reference.hue) >= 25 || lightnessGap >= 0.2;
  }

  return lightnessGap >= 0.2;
};

const candidateScore = (candidate: ColorCandidate): number => Math.sqrt(candidate.count) * (0.25 + candidate.saturation);

/** Builds a cohesive fallback color from the primary by rotating hue and tuning lightness. */
const deriveVariant = (candidate: ColorCandidate, hueShift: number, lightness: number): string =>
  rgbToHex(
    hslToRgb({
      h: (candidate.hue + hueShift + 360) % 360,
      s: clampValue(candidate.saturation || 0.5, 0.35, 0.85),
      l: clampValue(lightness, 0.25, 0.75),
    }),
  );

const quantizeRgb = ([red, green, blue]: RgbColor): RgbColor => [
  Math.min(255, Math.round(red / 24) * 24),
  Math.min(255, Math.round(green / 24) * 24),
  Math.min(255, Math.round(blue / 24) * 24),
];

const selectBrandColors = (candidates: ColorCandidate[]): CompanyBrandColors => {
  const ranked = candidates.filter(isUsefulBrandColor).sort((first, second) => candidateScore(second) - candidateScore(first));
  const primaryCandidate = ranked[0];

  if (!primaryCandidate) {
    return DEFAULT_COMPANY_BRAND_COLORS;
  }

  const secondaryCandidate = ranked.find(candidate => isDistinctColor(candidate, primaryCandidate));
  const accentCandidate = ranked.find(
    candidate => isDistinctColor(candidate, primaryCandidate) && (!secondaryCandidate || isDistinctColor(candidate, secondaryCandidate)),
  );

  const primary = primaryCandidate.hex;
  const secondary = secondaryCandidate?.hex ?? deriveVariant(primaryCandidate, 32, primaryCandidate.lightness + 0.12);
  const accent = accentCandidate?.hex ?? deriveVariant(primaryCandidate, -28, Math.max(0.55, primaryCandidate.lightness + 0.25));

  return normalizeBrandColors({ primary, secondary, accent });
};

const countColorCandidate = (map: Map<string, ColorCandidate>, hexColor: string): void => {
  const rgb = hexToRgb(hexColor);

  if (!rgb) {
    return;
  }

  const current = map.get(hexColor);

  if (current) {
    map.set(hexColor, { ...current, count: current.count + 1 });
    return;
  }

  const { h, s, l } = rgbToHsl(rgb);
  map.set(hexColor, { hex: hexColor, count: 1, saturation: s, lightness: l, hue: h });
};

const extractSvgColors = async (file: File): Promise<CompanyBrandColors> => {
  const svgText = await file.text();
  const colorMap = new Map<string, ColorCandidate>();
  const hexMatches = svgText.match(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g) ?? [];

  hexMatches.forEach(match => {
    const normalizedColor = normalizeHexColor(match);
    if (normalizedColor) {
      countColorCandidate(colorMap, normalizedColor);
    }
  });

  const rgbMatches = svgText.matchAll(/rgba?\(([^)]+)\)/g);
  Array.from(rgbMatches).forEach(match => {
    const values = match[1]
      ?.split(',')
      .slice(0, 3)
      .map(value => Number.parseInt(value.trim(), 10));

    if (values?.length === 3 && values.every(value => Number.isFinite(value))) {
      countColorCandidate(colorMap, rgbToHex(values as RgbColor));
    }
  });

  return selectBrandColors(Array.from(colorMap.values()));
};

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to load logo image'));
    };

    image.src = objectUrl;
  });

const extractRasterColors = async (file: File): Promise<CompanyBrandColors> => {
  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  const maxSize = 96;
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    return DEFAULT_COMPANY_BRAND_COLORS;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const colorMap = new Map<string, ColorCandidate>();

  for (let index = 0; index < pixels.length; index += 16) {
    const alpha = pixels[index + 3] ?? 0;

    if (alpha < 128) {
      continue;
    }

    const rgb = quantizeRgb([pixels[index] ?? 0, pixels[index + 1] ?? 0, pixels[index + 2] ?? 0]);
    countColorCandidate(colorMap, rgbToHex(rgb));
  }

  return selectBrandColors(Array.from(colorMap.values()));
};

const extractLogoBrandColors = async (file: File): Promise<CompanyBrandColors> => {
  const extension = (file.name.split('.').pop() ?? '').toLowerCase();

  if (file.type === 'image/svg+xml' || extension === 'svg') {
    return extractSvgColors(file);
  }

  return extractRasterColors(file);
};

const isAllowedLogoFile = (file: File): boolean => {
  const extension = (file.name.split('.').pop() ?? '').toLowerCase();
  return ALLOWED_LOGO_EXTENSIONS.has(extension) && ALLOWED_LOGO_MIME_TYPES.has(file.type);
};

const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => {
  const normalizedValue = normalizeHexColor(value) || DEFAULT_COMPANY_BRAND_COLORS.primary;

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          aria-label={`${label} - seletor`}
          className="h-10 w-12 shrink-0 cursor-pointer p-1"
          type="color"
          value={normalizedValue}
          onChange={event => onChange(event.target.value)}
        />
        <Input
          aria-label={`${label} - hexadecimal`}
          className="font-mono uppercase"
          value={value}
          maxLength={7}
          onChange={event => onChange(event.target.value)}
          placeholder="#1260A8"
        />
      </div>
    </div>
  );
};

export const CompanyBrandFields = ({ company, setField }: { company: CompanyProfile; setField: FieldSetter }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const brandColors = normalizeBrandColors(company.brandColors);
  const displayName = company.nomeFantasia || company.razaoSocial || 'Nome fantasia';

  const updateBrandColor = (key: keyof CompanyBrandColors, value: string): void => {
    const nextValue = value.startsWith('#') ? value : `#${value}`;

    if (!/^#[0-9a-fA-F]{0,6}$/.test(nextValue)) {
      return;
    }

    setField('brandColors', {
      ...brandColors,
      [key]: nextValue.toUpperCase(),
    });
  };

  const normalizeBrandColor = (key: keyof CompanyBrandColors): void => {
    const normalizedColor = normalizeHexColor(company.brandColors[key]) || DEFAULT_COMPANY_BRAND_COLORS[key];
    setField('brandColors', {
      ...brandColors,
      [key]: normalizedColor,
    });
  };

  const uploadLogo = async (file: File): Promise<void> => {
    if (!isAllowedLogoFile(file)) {
      toast.error('Envie uma logo PNG, JPG, WebP ou SVG.');
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      toast.error('A logo deve ter no máximo 5 MB.');
      return;
    }

    setIsUploading(true);

    try {
      const extractedColorsPromise = extractLogoBrandColors(file);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/media/upload', { method: 'POST', body: formData });
      const data = (await response.json()) as { url?: string; key?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? 'Upload failed');
      }

      const extractedColors = await extractedColorsPromise;

      setField('logoUrl', data.url);
      setField('logoKey', data.key ?? '');
      setField('logoFileName', file.name);
      setField('logoMimeType', file.type);
      setField('brandColors', extractedColors);

      toast.success('Logo enviada e paleta identificada.');
    } catch (error) {
      console.error('Logo upload failed:', error);
      toast.error('Não foi possível enviar a logo.');
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogoSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    uploadLogo(file);
  };

  const clearLogo = (): void => {
    setField('logoUrl', '');
    setField('logoKey', '');
    setField('logoFileName', '');
    setField('logoMimeType', '');
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Identidade visual</p>
        </div>
        <p className="text-xs text-muted-foreground">A logo aparece no sistema. As cores podem ser detectadas e editadas manualmente.</p>
      </div>

      <div className="flex flex-col gap-4 rounded-md border bg-background p-4 sm:flex-row sm:items-center">
        {company.logoUrl ? (
          <LogoMark
            src={company.logoUrl}
            alt={`Logo ${displayName}`}
            width={180}
            height={56}
            className="h-20 w-full border p-3 sm:w-48"
            imageClassName="max-h-14 max-w-full"
          />
        ) : (
          <div className="flex h-20 w-full items-center justify-center rounded-md border bg-muted/30 p-3 sm:w-48">
            <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{displayName}</span>
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-3">
          <input ref={fileInputRef} type="file" accept={LOGO_ACCEPT} className="hidden" onChange={handleLogoSelect} />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Enviar logo
            </Button>

            {company.logoUrl && (
              <Button type="button" variant="ghost" onClick={clearLogo} disabled={isUploading}>
                <X className="mr-2 h-4 w-4" />
                Remover
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">PNG, JPG, WebP ou SVG até 5 MB.</p>
          {company.logoFileName && <p className="truncate text-xs text-muted-foreground">{company.logoFileName}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border bg-background p-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="use-logo-colors">Usar cores da logo no sistema</Label>
          <p className="text-xs text-muted-foreground">Quando ativo, a paleta salva abaixo altera os destaques e a barra lateral.</p>
        </div>
        <Switch id="use-logo-colors" checked={company.useLogoColors} onCheckedChange={checked => setField('useLogoColors', checked)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div onBlur={() => normalizeBrandColor('primary')}>
          <ColorInput label="Primária" value={company.brandColors.primary} onChange={value => updateBrandColor('primary', value)} />
        </div>
        <div onBlur={() => normalizeBrandColor('secondary')}>
          <ColorInput label="Secundária" value={company.brandColors.secondary} onChange={value => updateBrandColor('secondary', value)} />
        </div>
        <div onBlur={() => normalizeBrandColor('accent')}>
          <ColorInput label="Apoio" value={company.brandColors.accent} onChange={value => updateBrandColor('accent', value)} />
        </div>
      </div>
    </div>
  );
};
