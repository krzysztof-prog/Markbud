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
  }>;
  summary: {
    totalItems: number;
    totalQuantity: number;
    orderBreakdown: Record<string, { count: number; quantity: number }>;
  };
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
  const lines = fileContent.split(/\r?\n/).filter((line) => line.trim());

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

      const item = {
        position: indices.position >= 0 ? parseInt(values[indices.position]) || i : i,
        widthMm: indices.width >= 0 ? parseInt(values[indices.width]) || 0 : 0,
        heightMm: indices.height >= 0 ? parseInt(values[indices.height]) || 0 : 0,
        quantity: indices.quantity >= 0 ? parseInt(values[indices.quantity]) || 1 : 1,
        orderNumber,
        orderSuffix: orderSuffix || undefined,
        fullReference,
        glassComposition: indices.composition >= 0 ? values[indices.composition] || '' : '',
        serialNumber: indices.serialNumber >= 0 ? values[indices.serialNumber] || '' : '',
        clientCode: indices.clientCode >= 0 ? values[indices.clientCode] || '' : '',
      };

      items.push(item);

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
  };
}