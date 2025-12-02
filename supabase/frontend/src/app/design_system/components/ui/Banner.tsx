import type { HTMLAttributes, JSX } from 'react';
import { AlertCircle, Info, CheckCircle2, X } from 'lucide-react';

export type BannerVariant = 'info' | 'success' | 'warning' | 'error';
export interface BannerProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BannerVariant;
  title?: string;
  message: string;
  dismissible?: boolean;
  onClose?: () => void;
}

const variantStyles: Record<BannerVariant, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-900',
};

const iconStyles: Record<BannerVariant, string> = {
  info: 'text-blue-500',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
};

const icons: Record<BannerVariant, JSX.Element> = {
  info: <Info className="h-4 w-4" />,
  success: <CheckCircle2 className="h-4 w-4" />,
  warning: <AlertCircle className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
};

export function Banner({
  variant = 'info',
  title,
  message,
  dismissible = false,
  onClose,
  className = '',
  ...props
}: BannerProps) {
  const baseClasses =
    'relative flex items-start gap-3 rounded-md border px-4 py-3 text-sm';

  const classes = [baseClasses, variantStyles[variant], className]
    .filter(Boolean)
    .join(' ');

  const iconClass = ['mt-0.5 flex-shrink-0', iconStyles[variant]]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role="status" {...props}>
      <span className={iconClass}>{icons[variant]}</span>
      <div className="flex-1">
        {title && <div className="font-medium mb-0.5">{title}</div>}
        <p className="text-sm leading-snug">{message}</p>
      </div>
      {dismissible && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onClose}
          className="ml-3 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current/30 text-current/70 hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}