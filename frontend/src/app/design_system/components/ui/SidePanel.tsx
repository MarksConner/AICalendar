import type { ReactNode, HTMLAttributes, JSX } from "react";
import { X } from "lucide-react";

export interface SidePanelProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: 'left' | 'right';
}

export const SidePanel = ({
  isOpen,
  onClose,
  title,
  children,
  side = "right",
  className = "",
  ...props
}: SidePanelProps): JSX.Element | null => {
  if (!isOpen) return null;

  const slideClass = side === "right" ? "right-0" : "left-0";

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/50"
      onClick={onClose}
    >
      <div
        className={`absolute top-0 ${slideClass} h-full w-full max-w-md bg-card shadow-card flex flex-col ${className}`}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-h2">{title}</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
