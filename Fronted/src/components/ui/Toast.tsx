import { useUIStore, type Toast } from '@/store/uiStore';
import { clsx } from 'clsx';

const toastIcons: Record<Toast['type'], string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

const toastStyles: Record<Toast['type'], string> = {
  success: 'border-success-green/30 bg-surface-container-high',
  error: 'border-error-red/30 bg-surface-container-high',
  warning: 'border-warning-amber/30 bg-surface-container-high',
  info: 'border-primary/30 bg-surface-container-high',
};

const iconStyles: Record<Toast['type'], string> = {
  success: 'text-success-green',
  error: 'text-error-red',
  warning: 'text-warning-amber',
  info: 'text-primary',
};

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useUIStore();

  return (
    <div
      className={clsx(
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-glass-lg animate-slide-in min-w-[320px] max-w-sm',
        toastStyles[toast.type]
      )}
    >
      <span className={clsx('material-symbols-outlined text-[20px] mt-0.5 shrink-0', iconStyles[toast.type])}>
        {toastIcons[toast.type]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-card-title text-card-title text-on-surface">{toast.title}</p>
        {toast.message && (
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

// Hook for convenient toast dispatch
export function useToast() {
  const { addToast } = useUIStore();
  return {
    success: (title: string, message?: string) => addToast({ type: 'success', title, message }),
    error: (title: string, message?: string) => addToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) => addToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) => addToast({ type: 'info', title, message }),
  };
}

// Keyboard shortcut hint component
export function KbdShortcut({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-0.5">
      {keys.map((k, i) => (
        <kbd key={i} className="text-[10px] font-mono-data bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 text-on-surface-variant">
          {k}
        </kbd>
      ))}
    </span>
  );
}
