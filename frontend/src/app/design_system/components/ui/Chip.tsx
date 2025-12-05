import type { HTMLAttributes } from 'react';
import { X } from 'lucide-react';

export interface ChipProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  onRemove?: () => void;
  variant?: 'default' | 'primary';
}

export function Chip({ label, onRemove, variant = 'default', className = '', ...props }: ChipProps) {
  const variantStyles = {
    default: 'bg-secondary text-secondary-foreground',
    primary: 'bg-primary/10 text-primary',
  };
  
  return (
    <div
      className={`inline-flex items-center gap-1 h-6 px-2 rounded text-caption ${variantStyles[variant]} ${className}`}
      {...props}
    >
      <span>{label}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:opacity-70 transition-opacity"
          aria-label="Remove"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
