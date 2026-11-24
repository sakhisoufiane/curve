import React, { useState } from 'react';
import { Button } from '../../components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/dialog';
import { Separator } from '../../components/separator';
import { Spinner } from '../../components/spinner';
import { FileDrop } from '../FileDrop';
import { Download } from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  entityName: string;
  accept: string;
  onImport: (file: File) => Promise<void>;
  onSuccess?: () => void;
  description?: string;
  templateName?: string;
  onDownloadTemplate?: () => Promise<Blob>;
  children?: React.ReactNode;
}

export function ImportDialog({
  open,
  onClose,
  entityName,
  accept,
  onImport,
  onSuccess,
  description,
  templateName,
  onDownloadTemplate,
  children,
}: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (isLoading) return;
    setFile(null);
    setError(null);
    onClose();
  }

  async function handleImport() {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      await onImport(file);
      handleClose();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDownloadTemplate() {
    if (!onDownloadTemplate) return;
    const blob = await onDownloadTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateName ?? `${entityName.toLowerCase()}-import-template`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-4xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import {entityName}</DialogTitle>
          {description && <DialogDescription className="my-4">{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-5">
          <FileDrop
            value={file}
            onChange={(f) => {
              setFile(f);
              setError(null);
            }}
            accept={accept}
          />

          {children && (
            <>
              <Separator />
              <div className="my-4">{children}</div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          {onDownloadTemplate && (
            <Button variant="outline" className="mr-auto gap-1.5" onClick={handleDownloadTemplate}>
              <Download className="size-3.5" />
              Download Template
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || isLoading} className="relative">
            <span className={isLoading ? 'invisible' : undefined}>Import</span>
            {isLoading && <Spinner className="absolute inset-0 m-auto" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { ImportDialogProps };
