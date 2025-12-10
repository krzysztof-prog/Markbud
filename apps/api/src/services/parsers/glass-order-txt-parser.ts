import iconv from 'iconv-lite';

export interface ParsedGlassOrderTxt {
  metadata: {
    orderDate: Date;
    glassOrderNumber: string;
    supplier: string;
    orderedBy: string;
    expectedDeliveryDate: Date;
  };
  items: Array<{
    glassType: string;
    quantity: number;
    widthMm: number;
    heightMm: number;
    position: string;
    orderNumber: string;
    orderSuffix?: string;
    fullReference: string;
  }>;
  summary: {
    totalItems: number;
    totalQuantity: number;
    orderBreakdown: Record<string, { count: number; quantity: number }>;
  };
}

function detectEncoding(buffer: Buffer): string {
  // Sprawdź czy UTF-8 (szukaj BOM lub poprawnych sekwencji)
  const utf8Text = buffer.toString('utf-8');
  if (!/�/.test(utf8Text) && !/\uFFFD/.test(utf8Text)) {
    return 'utf-8';
  }
  // Domyślnie Windows-1250 dla polskich znaków
  return 'windows-1250';
}

function parseOrderReference(reference: string): {
  orderNumber: string;
  orderSuffix: string | null;
  fullReference: string;
} {
  const trimmed = reference.trim();

  // Pattern: "53479 poz.1" lub "53480-a poz.2"
  const match = trimmed.match(/(\d+)(?:-([a-zA-Z]+))?\s*(?:poz\.(\d+))?/);

  if (!match) {
    throw new Error(`Nie można sparsować referencji zlecenia: ${reference}`);
  }

  return {
    orderNumber: match[1],
    orderSuffix: match[2] || null,
    fullReference: trimmed,
  };
}

function parsePolishDate(dateStr: string): Date {
  // Format: "19.11.2025" lub "3 12 25"

  // Format DD.MM.YYYY
  const dotMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) {
    return new Date(
      parseInt(dotMatch[3]),
      parseInt(dotMatch[2]) - 1,
      parseInt(dotMatch[1])
    );
  }

  // Format D M YY (z "Dostawa na")
  const spaceMatch = dateStr.match(/(\d{1,2})\s+(\d{1,2})\s+(\d{2})/);
  if (spaceMatch) {
    return new Date(
      2000 + parseInt(spaceMatch[3]),
      parseInt(spaceMatch[2]) - 1,
      parseInt(spaceMatch[1])
    );
  }

  return new Date();
}

export function parseGlassOrderTxt(fileContent: string | Buffer): ParsedGlassOrderTxt {
  let content: string;

  if (Buffer.isBuffer(fileContent)) {
    const encoding = detectEncoding(fileContent);
    content = iconv.decode(fileContent, encoding);
  } else {
    content = fileContent;
  }

  const lines = content.split(/\r?\n/);

  // Parse header
  let orderDate = new Date();
  let glassOrderNumber = '';
  let supplier = 'NIEZNANY';

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];

    // Data i godzina
    const dateMatch = line.match(/Data\s+(\d{1,2}\.\d{1,2}\.\d{4})/i);
    if (dateMatch) {
      orderDate = parsePolishDate(dateMatch[1]);
    }

    // Numer zamówienia
    const numberMatch = line.match(/Numer\s+(.+)/i);
    if (numberMatch) {
      glassOrderNumber = numberMatch[1].trim();
    }

    // Dostawca
    if (/PILKINGTON|GUARDIAN|SAINT.?GOBAIN/i.test(line)) {
      supplier = line.trim().toUpperCase();
    }
  }

  if (!glassOrderNumber) {
    throw new Error('Nie znaleziono numeru zamówienia w pliku');
  }

  // Find table start
  const tableStartIndex = lines.findIndex((line) =>
    line.includes('Symbol') && line.includes('Ilość') && line.includes('Zlecenie')
  );

  if (tableStartIndex === -1) {
    throw new Error('Nie znaleziono tabeli z pozycjami');
  }

  // Parse items
  const items: ParsedGlassOrderTxt['items'] = [];
  const orderBreakdown: Record<string, { count: number; quantity: number }> = {};

  for (let i = tableStartIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Stop at footer (signature or empty lines)
    if (!line || /^\s*[A-ZŻŹĆĄĘŁÓŚŃ]\.[A-Za-zżźćąęłóśń]/.test(line)) {
      // Check for delivery date in remaining lines
      continue;
    }

    // Skip lines that look like footer
    if (/Dostawa na/i.test(line)) {
      continue;
    }

    // Parse table row - format: Symbol | Ilość | Szer | Wys | Poz | Zlecenie
    // Może być tab-separated lub fixed-width
    const parts = line.split(/\s{2,}|\t/).filter(Boolean);

    if (parts.length < 6) continue;

    try {
      const glassType = parts[0];
      const quantity = parseInt(parts[1]);
      const widthMm = parseInt(parts[2]);
      const heightMm = parseInt(parts[3]);
      const position = parts[4];
      const orderRef = parts.slice(5).join(' '); // Może być rozdzielone

      if (isNaN(quantity) || isNaN(widthMm) || isNaN(heightMm)) {
        continue;
      }

      const { orderNumber, orderSuffix, fullReference } = parseOrderReference(orderRef);

      items.push({
        glassType,
        quantity,
        widthMm,
        heightMm,
        position,
        orderNumber,
        orderSuffix: orderSuffix || undefined,
        fullReference,
      });

      const key = orderSuffix ? `${orderNumber}-${orderSuffix}` : orderNumber;
      if (!orderBreakdown[key]) {
        orderBreakdown[key] = { count: 0, quantity: 0 };
      }
      orderBreakdown[key].count++;
      orderBreakdown[key].quantity += quantity;
    } catch (error) {
      console.warn(`Błąd parsowania linii: ${line}`, error);
    }
  }

  // Parse footer (orderedBy, expectedDeliveryDate)
  let orderedBy = '';
  let expectedDeliveryDate = new Date();

  for (let i = tableStartIndex + items.length; i < lines.length; i++) {
    const line = lines[i];

    // Signature (W.Kania, M.Kowalski, etc.)
    const nameMatch = line.match(/^\s*([A-ZŻŹĆĄĘŁÓŚŃ]\.[A-Za-zżźćąęłóśń]+)/);
    if (nameMatch) {
      orderedBy = nameMatch[1];
    }

    // Delivery date
    const deliveryMatch = line.match(/Dostawa\s+na\s+(\d{1,2}\s+\d{1,2}\s+\d{2})/i);
    if (deliveryMatch) {
      expectedDeliveryDate = parsePolishDate(deliveryMatch[1]);
    }
  }

  return {
    metadata: {
      orderDate,
      glassOrderNumber,
      supplier,
      orderedBy,
      expectedDeliveryDate,
    },
    items,
    summary: {
      totalItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      orderBreakdown,
    },
  };
}