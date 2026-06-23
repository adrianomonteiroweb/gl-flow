'use client';

import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { ImageIcon, Paperclip, Send, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string, type?: 'text' | 'image') => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSendMessage, disabled = false }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (imagePreview) {
      onSendMessage(imagePreview, 'image');
      setImagePreview(null);
      return;
    }

    if (message.trim()) {
      onSendMessage(message.trim(), 'text');
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/media/upload', { method: 'POST', body: formData });
      const data = await response.json();

      if (data.url) {
        setImagePreview(data.url);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border-t bg-white dark:bg-background p-4">
      {imagePreview && (
        <div className="mb-2 relative inline-block">
          <img src={imagePreview} alt="Preview" className="max-h-32 rounded-md" />
          <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => setImagePreview(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
        {/* <Button
          variant="ghost"
          size="icon"
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}>
          <ImageIcon className="h-5 w-5" />
        </Button> */}

        <Input
          placeholder="Digite uma mensagem..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled || !!imagePreview}
          className="flex-1 bg-white dark:bg-background"
        />

        <Button onClick={handleSend} disabled={disabled || (!message.trim() && !imagePreview) || isUploading} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
