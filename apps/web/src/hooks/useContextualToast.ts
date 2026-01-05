'use client';

import { useToast } from '@/hooks/useToast';

export type ContextualToastVariant = 'info' | 'warning' | 'error' | 'success';

interface ContextualToastOptions {
  title: string;
  message: string;
  reason: string;
  variant?: ContextualToastVariant;
  action?: { label: string; onClick: () => void };
}

export function useContextualToast() {
  const { toast } = useToast();

  const showContextualToast = ({
    title,
    message,
    reason,
    variant = 'info',
    action: _action,
  }: ContextualToastOptions) => {
    const variantMap = {
      info: 'default' as const,
      warning: 'warning' as const,
      error: 'destructive' as const,
      success: 'success' as const,
    };

    toast({
      title,
      description: `${message} ${reason}`,
      variant: variantMap[variant],
    });
  };

  return { showContextualToast };
}

export default useContextualToast;
