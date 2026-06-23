import Image from 'next/image';

import { cn } from '@workspace/ui/lib/utils';

type LogoMarkProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  imageClassName?: string;
};

/**
 * Renders the company logo on a light surface so it stays legible on any
 * background (dark sidebar, light/dark themes) and for any logo type —
 * colored, opaque (JPG) or transparent (PNG/SVG).
 */
export const LogoMark = ({ src, alt, width, height, className, imageClassName }: LogoMarkProps) => (
  <div className={cn('flex items-center justify-center rounded-md bg-white ring-1 ring-black/5', className)}>
    <Image src={src} alt={alt} width={width} height={height} className={cn('object-contain', imageClassName)} unoptimized />
  </div>
);
