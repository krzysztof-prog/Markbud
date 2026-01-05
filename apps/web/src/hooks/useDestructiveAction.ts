'use client';

import { useState } from 'react';

interface DestructiveActionConfig {
  actionName: string;
  confirmText: string;
  consequences: string[];
  onExecute: () => Promise<void>;
}

export function useDestructiveAction(config: DestructiveActionConfig) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const trigger = () => setIsOpen(true);

  const execute = async () => {
    setIsExecuting(true);
    try {
      await config.onExecute();
      setIsOpen(false);
    } catch (error) {
      console.error('Destructive action failed:', error);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    isExecuting,
    trigger,
    execute
  };
}

export default useDestructiveAction;
