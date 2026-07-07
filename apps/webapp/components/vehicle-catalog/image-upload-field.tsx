'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';

interface ImageUploadFieldProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 25 * 1024 * 1024;

export const ImageUploadField = ({ value, onChange, disabled }: ImageUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Formato inválido. Envie uma imagem JPG, PNG, WEBP ou GIF.');
      return;
    }

    if (file.size > MAX_SIZE) {
      toast.error('Imagem muito grande (máx. 25 MB).');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/media/upload', { method: 'POST', body: formData });

      if (!res.ok) {
        toast.error('Falha ao enviar a imagem.');
        return;
      }

      const data = (await res.json()) as { url?: string };

      if (!data.url) {
        toast.error('Falha ao enviar a imagem.');
        return;
      }

      onChange(data.url);
    } catch {
      toast.error('Falha ao enviar a imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      handleFile(file);
    }

    event.target.value = '';
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(',')} className="hidden" onChange={handleChange} disabled={disabled || uploading} />

      {value ? (
        <div className="relative flex h-40 items-center justify-center rounded-md border border-border bg-muted/30 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Prévia do veículo" className="max-h-full max-w-full object-contain" />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-2 top-2 h-7 w-7"
            aria-label="Remover imagem"
            disabled={disabled || uploading}
            onClick={() => onChange(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className={cn(
            'flex h-40 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 text-sm text-muted-foreground transition-colors',
            'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50'
          )}>
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
          <span>{uploading ? 'Enviando...' : 'Enviar imagem do veículo'}</span>
        </button>
      )}
    </div>
  );
};
