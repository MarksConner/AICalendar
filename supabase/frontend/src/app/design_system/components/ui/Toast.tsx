import type { HTMLAttributes, JSX } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant;
  title: string;
  description?: string;
  onClose?: () => void;
}

const icons: Record<ToastVariant, JSX.Element> = {
  success: (
    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
  ),
  error: (
    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
  ),
  info: <Info className="w-5 h-5 text-primary" />,
};

export const Toast = ({
  variant = "info",
  title,
  description,
  onClose,
  className = "",
  ...props
}: ToastProps): JSX.Element => {
  return (
    <div
      className={`flex items-start gap-3 p-4 bg-card border border-border rounded-lg shadow-card max-w-sm ${className}`}
      {...props}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[variant]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-body text-card-foreground">{title}</p>
        {description && (
          <p className="text-caption text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
