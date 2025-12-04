import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, errorText, className = '', ...props }, ref) => {
    const hasError = !!errorText;
    
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label className="text-caption text-foreground"
            style={{ marginRight: "4px", marginBottom: "4px" }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`h-10 w-full rounded-lg border border-input bg-input-background px-3 py-2 transition-all placeholder:text-muted-foreground focus:outline-none focus:shadow-focus ${
            hasError ? 'border-destructive' : ''
          } ${className}`}
          {...props}
        />
        {helperText && !errorText && (
          <span className="text-caption text-muted-foreground">{helperText}</span>
        )}
        {errorText && (
          <span className="text-caption text-destructive">{errorText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
