import type { HTMLAttributes } from 'react';

export type TimelineStatus = 'default' | 'active' | 'completed';

export interface TimelineRowProps extends HTMLAttributes<HTMLDivElement> {
  time: string;
  title: string;
  description?: string;
  status?: TimelineStatus;
}

export function TimelineRow({ time, title, description, status = 'default', className = '', ...props }: TimelineRowProps) {
  const statusColors: Record<TimelineStatus, string> = {
    default: 'bg-muted',
    active: 'bg-primary',
    completed: 'bg-green-500',
  };
  
  return (
    <div className={`flex gap-4 ${className}`} {...props}>
      <div className="flex flex-col items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <div className="w-px flex-1 bg-border" />
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-baseline gap-3">
          <span className="text-caption text-muted-foreground min-w-[60px]">{time}</span>
          <div>
            <p className="text-body text-foreground">{title}</p>
            {description && (
              <p className="text-caption text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
