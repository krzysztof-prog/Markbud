import { stripBOM } from '../../utils/string-utils.js';

// Typ kategorii szyb
export type GlassCategory = 'standard' | 'loose' | 'aluminum' | 'reclamation';

export interface CategorizedGlassItem {
  customerOrderNumber: string;
  clientName: string | null;
  widthMm: number;
  heightMm: number;
  quantity: number;
  orderNumber: string;
  glassComposition: string;
}

export interface ParsedGlassDeliveryCsv {
  metadata: {
    rackNumber: string;
    customerOrderNumber: string;
    supplierOrderNumber: string;
    deliveryDate: Date;
  };
  items: Array<{
    position: number;
    widthMm: number;
    heightMm: number;
    quantity: number;
    orderNumber: string;
    orderSuffix?: string;
    fullReference: string;
    glassComposition: string;
    serialNumber: string;
    clientCode: string;
    // Nowe pola dla kategoryzacji
    category: GlassCategory;
    categoryClientName?: string;
  }>;
  summary: {
    totalItems: number;
    totalQuantity: number;
    orderBreakdown: Record<string, { count: number; quantity: number }>;
  };
  // Skategoryzowane szyby
  categorized: {
    loose: CategorizedGlassItem[];
    aluminum: CategorizedGlassItem[];
    reclamation: CategorizedGlassItem[];
  };
}

/**
 * Wykrywa kategorię szyby na podstawie numeru zamówienia klienta
 *
 * Priorytet (zgodnie z ustaleniami):
 * 1. reclamation - zawiera "R/"
 * 2. aluminum - zawiera "AL."
 * 3. loose - 9-11 cyfr (np. 20251205431) lub nie zawiera długiego numeru
 * 4. standard - wszystko inne (normalne szyby produkcyjne)
 */
function detectGlassCategory(customerOrderNumber: string): {
  category: GlassCategory;
  clientName: string | null;
} {
  const trimmed = customerOrderNumber.trim().toUpperCase();

  // 1. Reklamacyjne - zawiera "R/"
  if (trimmed.includes('R/')) {
    return {
      category: 'reclamation',
      clientName: extractClientName(customerOrderNumber)
    };
  }

  // 2. Aluminiowe - zawiera "AL."
  if (trimmed.includes('AL.')) {
    return {
      category: 'aluminum',
      clientName: extractClientName(customerOrderNumber)
    };
  }

  // 3. Szyby luzem - 9-11 cyfr (np. 20251205431HALEX) lub bez długiego numeru (np. "WOHL AKR 16 GRUDZIEŃ")
  // Sprawdź czy zaczyna się od 9-11 cyfr
  const longNumberMatch = trimmed.match(/^(\d{9,11})/);
  if (longNumberMatch) {
    // Wyciągnij nazwę klienta - wszystko po cyfrach
    const afterNumber = customerOrderNumber.substring(longNumberMatch[1].length).trim();
    // Usuń średnik jeśli występuje na początku
    const clientName = afterNumber.replace(/^[;:\s]+/, '').trim() || null;
    return {
      category: 'loose',
      clientName
    };
  }

  // Sprawdź czy to jest format bez długiego numeru (np. "WOHL AKR 16 GRUDZIEŃ")
  // Jeśli nie zaczyna się od 5-cyfrowego numeru zlecenia typowego, to jest luzem
  const standardOrderMatch = trimmed.match(/^\d{4,6}(?:\s|$|-)/);
  if (!standardOrderMatch) {
    // Nie wygląda jak standardowe zamówienie - to szyby luzem
    return {
      category: 'loose',
      clientName: customerOrderNumber.trim() || null
    };
  }

  // 4. Standardowe szyby produkcyjne
  return { category: 'standard', clientName: null };
}

/**
 * Wyciąga nazwę klienta z numeru zamówienia
 * Obsługuje różne formaty:
 * - "R/12345;KLIENT" -> "KLIENT"
 * - "AL.12345 FIRMA" -> "FIRMA"
 */
function extractClientName(customerOrderNumber: string): string | null {
  // Szukaj średnika
  const semicolonIndex = customerOrderNumber.indexOf(';');
  if (semicolonIndex !== -1) {
    const after = customerOrderNumber.substring(semicolonIndex + 1).trim();
    if (after) return after;
  }

  // Szukaj po spacji (po numerach)
  const parts = customerOrderNumber.split(/\s+/);
  if (parts.length > 1) {
    // Zwróć ostatnią część która nie wygląda jak numer
    for (let i = parts.length - 1; i >= 0; i--) {
      if (!/^\d+$/.test(parts[i]) && parts[i].length > 2) {
        return parts[i];
      }
    }
  }

  return null;
}

function parseOrderReference(reference: string): {
  orderNumber: string;
  orderSuffix: string | null;
  fullReference: string;
} {
  const trimmed = reference.trim();

  // Pattern: "3      53407 poz.3" lub "53407-a poz.3"
  // First number is position, second is order number
  const match = trimmed.match(/\d*\s*(\d+)(?:-([a-zA-Z]+))?\s*(?:poz\.(\d+))?/);

  if (match) {
    return {
      orderNumber: match[1],
      orderSuffix: match[2] || null,
      fullReference: trimmed,
    };
  }

  // Fallback - just extract numbers
  const simpleMatch = trimmed.match(/(\d+)(?:-([a-zA-Z]+))?/);
  if (simpleMatch) {
    return {
      orderNumber: simpleMatch[1],
      orderSuffix: simpleMatch[2] || null,
      fullReference: trimmed,
    };
  }

  throw new Error(`Nie można sparsować referencji zlecenia: ${reference}`);
}

export function parseGlassDeliveryCsv(fileContent: string): ParsedGlassDeliveryCsv {
  // Usuń BOM jeśli istnieje (pliki eksportowane z Excela często mają BOM)
  const cleanContent = stripBOM(fileContent);
  const lines = cleanContent.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('Plik CSV jest pusty lub nieprawidłowy');
  }

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(';').map((h) => h.trim());

  // Find column indices
  const findIndex = (names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex(h =>
        h.toLowerCase().includes(name.toLowerCase())
      );
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const indices = {
    rackNumber: findIndex(['Numer stojaka', 'stojak']),
    customerOrderNumber: findIndex(['Numer zamówienia klienta', 'zamówienia klienta']),
    supplierOrderNumber: findIndex(['Numer zamówienia dostawcy', 'zamówienia dostawcy']),
    position: findIndex(['Pozycja']),
    width: findIndex(['Szerokosc', 'Szerokość', 'szerok']),
    height: findIndex(['Wysokosc', 'Wysokość', 'wysok']),
    quantity: findIndex(['Sztuk', 'Ilość', 'ilosc']),
    orderRef: findIndex(['Zlecenie']),
    composition: findIndex(['Zespolenie', 'zespol']),
    serialNumber: findIndex(['Numer seryjny', 'seryjny']),
    clientCode: findIndex(['Kod klienta', 'klient']),
  };

  // Validate required columns
  if (indices.orderRef === -1) {
    throw new Error('Brak wymaganej kolumny "Zlecenie" w pliku CSV');
  }

  const items: ParsedGlassDeliveryCsv['items'] = [];
  const orderBreakdown: Record<string, { count: number; quantity: number }> = {};

  // Kolekcje dla skategoryzowanych szyb
  const categorized: ParsedGlassDeliveryCsv['categorized'] = {
    loose: [],
    aluminum: [],
    reclamation: []
  };

  let rackNumber = '';
  let customerOrderNumber = '';
  let supplierOrderNumber = '';

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = line.split(';').map((v) => v.trim());

    if (values.length < Math.max(...Object.values(indices).filter(v => v >= 0)) + 1) {
      continue;
    }

    // Get metadata from first row
    if (i === 1) {
      rackNumber = indices.rackNumber >= 0 ? values[indices.rackNumber] || '' : '';
      customerOrderNumber = indices.customerOrderNumber >= 0 ? values[indices.customerOrderNumber] || '' : '';
      supplierOrderNumber = indices.supplierOrderNumber >= 0 ? values[indices.supplierOrderNumber] || '' : '';
    }

    try {
      const orderRef = values[indices.orderRef] || '';
      if (!orderRef) continue;

      const { orderNumber, orderSuffix, fullReference } = parseOrderReference(orderRef);

      // Pobierz numer zamówienia klienta dla tego wiersza
      const rowCustomerOrderNumber = indices.customerOrderNumber >= 0
        ? values[indices.customerOrderNumber] || customerOrderNumber
        : customerOrderNumber;

      // Wykryj kategorię szyby
      const { category, clientName } = detectGlassCategory(rowCustomerOrderNumber);

      const widthMm = indices.width >= 0 ? parseInt(values[indices.width]) || 0 : 0;
      const heightMm = indices.height >= 0 ? parseInt(values[indices.height]) || 0 : 0;
      const quantity = indices.quantity >= 0 ? parseInt(values[indices.quantity]) || 1 : 1;
      const glassComposition = indices.composition >= 0 ? values[indices.composition] || '' : '';

      const item = {
        position: indices.position >= 0 ? parseInt(values[indices.position]) || i : i,
        widthMm,
        heightMm,
        quantity,
        orderNumber,
        orderSuffix: orderSuffix || undefined,
        fullReference,
        glassComposition,
        serialNumber: indices.serialNumber >= 0 ? values[indices.serialNumber] || '' : '',
        clientCode: indices.clientCode >= 0 ? values[indices.clientCode] || '' : '',
        category,
        categoryClientName: clientName || undefined
      };

      items.push(item);

      // Dodaj do odpowiedniej kolekcji kategoryzowanej
      if (category !== 'standard') {
        const categorizedItem: CategorizedGlassItem = {
          customerOrderNumber: rowCustomerOrderNumber,
          clientName,
          widthMm,
          heightMm,
          quantity,
          orderNumber,
          glassComposition
        };

        if (category === 'loose') {
          categorized.loose.push(categorizedItem);
        } else if (category === 'aluminum') {
          categorized.aluminum.push(categorizedItem);
        } else if (category === 'reclamation') {
          categorized.reclamation.push(categorizedItem);
        }
      }

      const key = orderSuffix ? `${orderNumber}-${orderSuffix}` : orderNumber;
      if (!orderBreakdown[key]) {
        orderBreakdown[key] = { count: 0, quantity: 0 };
      }
      orderBreakdown[key].count++;
      orderBreakdown[key].quantity += item.quantity;
    } catch (error) {
      console.warn(`Błąd parsowania linii ${i}: ${line}`, error);
    }
  }

  return {
    metadata: {
      rackNumber,
      customerOrderNumber,
      supplierOrderNumber,
      deliveryDate: new Date(),
    },
    items,
    summary: {
      totalItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      orderBreakdown,
    },
    categorized
  };
}