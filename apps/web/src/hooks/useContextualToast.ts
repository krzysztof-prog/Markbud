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
    action,
  }: ContextualToastOptions) => {
    toast({
      title,
      description: `${message} ${reason}`,
      variant: variant === 'info' ? 'default' : variant,
      action: action ? (
        <button onClick={action.onClick} className="px-3 py-1 text-sm">
          {action.label}
        </button>
      ) : undefined
    });
  };

  return { showContextualToast };
}

export default useContextualToast;
