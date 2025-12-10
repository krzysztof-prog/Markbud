import { cn } from '@/lib/utils';

interface GlassValidationBadgeProps {
  severity: 'info' | 'warning' | 'error';
  count?: number;
  className?: string;
}

export function GlassValidationBadge({
  severity,
  count,
  className,
}: GlassValidationBadgeProps) {
  const colors = {
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
  };

  const icons = {
    info: 'i',
    warning: '!',
    error: 'x',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
        colors[severity],
        className
      )}
    >
      <span className="font-bold">{icons[severity]}</span>
      {count !== undefined && <span>{count}</span>}
    </span>
  );
}
