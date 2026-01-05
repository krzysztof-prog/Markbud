'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertVariant = 'info' | 'warning' | 'error' | 'success';

interface ContextualAlertProps {
  variant: AlertVariant;
  title: string;
  message: string;
  reason: string; // Business explanation "why you see this"
  actionLabel?: string;
  onAction?: () => void;
  details?: string; // Optional technical details
  className?: string;
}

const VARIANT_CONFIG = {
  info: {
    icon: Info,
    containerClass: 'bg-blue-50 border-blue-200 text-blue-900',
    iconClass: 'text-blue-600',
    titleClass: 'text-blue-900',
    reasonClass: 'text-blue-700'
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    iconClass: 'text-yellow-600',
    titleClass: 'text-yellow-900',
    reasonClass: 'text-yellow-700'
  },
  error: {
    icon: XCircle,
    containerClass: 'bg-red-50 border-red-200 text-red-900',
    iconClass: 'text-red-600',
    titleClass: 'text-red-900',
    reasonClass: 'text-red-700'
  },
  success: {
    icon: CheckCircle,
    containerClass: 'bg-green-50 border-green-200 text-green-900',
    iconClass: 'text-green-600',
    titleClass: 'text-green-900',
    reasonClass: 'text-green-700'
  }
} as const;

export const ContextualAlert: React.FC<ContextualAlertProps> = ({
  variant,
  title,
  message,
  reason,
  actionLabel,
  onAction,
  details,
  className
}) => {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <Alert className={cn(config.containerClass, 'border', className)} role="alert">
      <Icon className={cn('h-5 w-5', config.iconClass)} aria-hidden="true" />
      <AlertTitle className={config.titleClass}>{title}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{message}</p>

        {/* NEW SECTION: Why you see this */}
        <div className={cn('flex items-start gap-2 mt-2 pt-2 border-t border-current/10', config.reasonClass)}>
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">Dlaczego to widzisz:</p>
            <p className="text-sm">{reason}</p>
          </div>
        </div>

        {/* Optional technical details */}
        {details && (
          <details className="text-xs opacity-70 mt-2">
            <summary className="cursor-pointer hover:opacity-100">Szczegóły techniczne</summary>
            <pre className="mt-1 p-2 bg-black/5 rounded overflow-x-auto">{details}</pre>
          </details>
        )}

        {/* Action */}
        {actionLabel && onAction && (
          <div className="mt-3">
            <Button
              onClick={onAction}
              size="sm"
              variant={variant === 'error' ? 'destructive' : 'default'}
            >
              {actionLabel}
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default ContextualAlert;
