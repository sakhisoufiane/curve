import * as React from 'react';
import { Toaster as Sonner, toast as sonnerToast, type ExternalToast } from 'sonner';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export type ToastType = 'success' | 'warning' | 'error';

export interface ShowToastOptions extends Omit<ExternalToast, 'className' | 'style'> {
  type: ToastType;
  title: string;
  description?: React.ReactNode;
}

const toastStyles: Record<ToastType, React.CSSProperties> = {
  success: {
    backgroundColor: 'var(--color-curve-success-green-lighter)',
    borderColor: 'var(--color-curve-success-green-light)',
    color: 'var(--color-curve-success-green-dark)',
  },
  warning: {
    backgroundColor: 'var(--color-curve-warning-lighter)',
    borderColor: 'var(--color-curve-warning)',
    color: 'var(--color-curve-warning-dark)',
  },
  error: {
    backgroundColor: 'var(--color-curve-danger-lighter)',
    borderColor: 'var(--color-curve-danger-light)',
    color: 'var(--color-curve-danger-dark)',
  },
};

const toastIconColors: Record<ToastType, string> = {
  success: 'var(--color-curve-success-green)',
  warning: 'var(--color-curve-warning)',
  error: 'var(--color-curve-danger)',
};

const duration: Record<ToastType, number> = {
  success: 3500,
  warning: 10000,
  error: 10000,
};

/**
 * Show a styled toast notification
 * @param options - Toast options including type, title, and optional description
 * @example
 * showToast({ type: "success", title: "Changes saved successfully" })
 * showToast({ type: "error", title: "Failed to save", description: "Please try again" })
 * showToast({ type: "warning", title: "Session expiring soon" })
 */
export function showToast({ type, title, description, ...options }: ShowToastOptions) {
  const IconComponent = type === 'success' ? CheckCircle2 : type === 'warning' ? AlertTriangle : AlertCircle;

  return sonnerToast(title, {
    description,
    icon: <IconComponent className="h-5 w-5" style={{ color: toastIconColors[type] }} />,
    style: toastStyles[type],
    duration: duration[type],
    ...options,
  });
}

const Toaster = ({ position = 'bottom-left', ...props }: ToasterProps) => {
  return (
    <Sonner
      position={position}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:border group-[.toaster]:shadow-lg group-[.toaster]:rounded-md',
          description: 'group-[.toast]:text-current group-[.toast]:opacity-80',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, sonnerToast as toast };
