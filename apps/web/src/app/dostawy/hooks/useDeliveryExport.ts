'use client';

import { useCallback } from 'react';
import { useDownloadDeliveryProtocol } from '@/features/deliveries/hooks/useDeliveries';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';

export interface UseDeliveryExportReturn {
  // Protocol download
  downloadProtocol: (deliveryId: number) => void;
  isDownloading: boolean;
}

/**
 * Hook managing delivery export functionality.
 *
 * Responsibilities:
 * - Download delivery protocol PDF
 * - Handle download success/error states
 */
export function useDeliveryExport(): UseDeliveryExportReturn {
  const downloadProtocolMutation = useDownloadDeliveryProtocol();

  const downloadProtocol = useCallback(
    (deliveryId: number) => {
      downloadProtocolMutation.mutate(deliveryId, {
        onSuccess: () => {
          showSuccessToast('Protokol pobrany', 'PDF protokolu odbioru zostal pobrany');
        },
        onError: (error) => {
          showErrorToast('Blad pobierania protokolu', getErrorMessage(error));
        },
      });
    },
    [downloadProtocolMutation]
  );

  return {
    downloadProtocol,
    isDownloading: downloadProtocolMutation.isPending,
  };
}
