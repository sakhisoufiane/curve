import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/dialog';

interface AppDialogProps extends React.ComponentProps<typeof Dialog> {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}

function AppDialog({ open, onClose, title, children, footer, className, ref, ...props }: AppDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()} {...props}>
      <DialogContent className={className} ref={ref}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

export { AppDialog };
export type { AppDialogProps };
