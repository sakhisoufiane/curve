import React, { useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { Badge } from '../../components/badge';
import { Label } from '../../components/label';
import { FileText, Upload, X } from 'lucide-react';

interface FileDropProps {
  value: File | null;
  onChange: (file: File | null) => void;
  accept: string;
}

const MIME_WILDCARD_LABELS: Record<string, string> = {
  'image/*': 'Image',
};

function formatAcceptToken(token: string): string {
  const trimmed = token.trim();
  return MIME_WILDCARD_LABELS[trimmed] ?? trimmed;
}

export function FileDrop({ value, onChange, accept }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onChange(dropped);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />

      <div
        className={cn(
          'flex min-w-0 items-center justify-center rounded-lg border border-dashed p-14 transition-colors',
          value ? 'cursor-default bg-muted/30' : 'cursor-pointer hover:bg-muted/50',
          !value && isDragging ? 'border-primary bg-primary/5' : 'bg-muted/30'
        )}
        onClick={() => !value && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {value ? (
          <div className="flex min-w-0 w-full items-center gap-3">
            <FileText className="size-5 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-sm font-medium">{value.name}</span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="shrink-0 rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100"
            >
              <X className="size-4" />
              <span className="sr-only">Remove file</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full border bg-background">
              <Upload className="size-5 text-muted-foreground" />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-sm">
                <Label className="cursor-pointer font-medium hover:underline">Click to upload</Label>
                <span className="text-muted-foreground"> or drag and drop</span>
              </p>
              <div className="flex flex-wrap justify-center gap-1">
                {accept.split(',').map((ext) => (
                  <Badge key={ext} variant="secondary" className="text-xs font-normal">
                    {formatAcceptToken(ext)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export type { FileDropProps };
