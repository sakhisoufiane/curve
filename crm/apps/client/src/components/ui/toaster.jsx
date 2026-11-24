import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast.jsx";
import { Toast, ToastClose, ToastDescription, ToastTitle } from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dispatch } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast
          key={id}
          {...props}
          onOpenChange={(open) => {
            if (!open) dispatch({ type: "DISMISS_TOAST", toastId: id });
          }}
        >
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
