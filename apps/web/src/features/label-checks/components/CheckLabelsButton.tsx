import { Button } from '@/components/ui/button';
import { ScanLine, Loader2 } from 'lucide-react';
import { useCheckLabels } from '../hooks/useLabelChecks';

interface Props {
  deliveryId: number;
  onSuccess?: () => void;
}

/**
 * Przycisk uruchamiajacy sprawdzanie etykiet OCR dla dostawy
 * Toasty sa obslugiwane przez hook useCheckLabels
 */
export function CheckLabelsButton({ deliveryId, onSuccess }: Props) {
  const { mutate, isPending } = useCheckLabels();

  const handleClick = () => {
    mutate(
      { deliveryId },
      {
        // Hook useCheckLabels juz wyswietla toasty w onSuccess/onError
        // Tutaj tylko wywolujemy callback przekazany z komponentu nadrzednego
        onSuccess: () => {
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <ScanLine className="w-4 h-4 mr-2" />
      )}
      Sprawdz etykiety
    </Button>
  );
}
