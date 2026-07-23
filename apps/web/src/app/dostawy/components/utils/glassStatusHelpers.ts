/**
 * Helpery do wyświetlania statusu szyb
 * Wyekstrahowane z DeliveryDetails.tsx - używane w wielu komponentach
 */

export function getGlassStatusDisplay(
  totalGlasses: number | null | undefined,
  orderedGlassCount: number | null | undefined,
  deliveredGlassCount: number | null | undefined,
  glassDeliveryDate: string | Date | null | undefined,
  hasSuffixMatchedGlass?: boolean
): { label: string; colorClass: string; suffixBadge: boolean } {
  const ordered = orderedGlassCount || 0;
  const delivered = deliveredGlassCount || 0;
  const total = totalGlasses || 0;
  const suffixBadge = hasSuffixMatchedGlass || false;

  // Brak szyb w zleceniu
  if (total === 0) {
    return { label: '-', colorClass: 'text-slate-400', suffixBadge: false };
  }

  // Wszystkie dostarczone (porównuj z totalGlasses - ile szyb potrzebuje zlecenie)
  if (delivered >= total) {
    return { label: 'OK', colorClass: 'bg-green-100 text-green-700', suffixBadge };
  }

  // Częściowo dostarczone (porównuj z totalGlasses)
  if (delivered > 0 && delivered < total) {
    return { label: `${delivered}/${total}`, colorClass: 'bg-yellow-100 text-yellow-700', suffixBadge };
  }

  // Zamówione ale nie dostarczone - pokazujemy "Zam." + datę dostawy jeśli jest
  if (ordered > 0 && glassDeliveryDate) {
    const date = new Date(glassDeliveryDate);
    const formatted = date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
    return { label: `Zam. ${formatted}`, colorClass: 'bg-blue-100 text-blue-700', suffixBadge: false };
  }

  // Zamówione ale brak daty dostawy - pokazuj "Zam." zamiast mylącego X/Y
  if (ordered > 0) {
    return { label: 'Zam.', colorClass: 'bg-orange-100 text-orange-700', suffixBadge: false };
  }

  // Nie zamówione
  return { label: 'Brak zam.', colorClass: 'bg-red-100 text-red-700', suffixBadge: false };
}
