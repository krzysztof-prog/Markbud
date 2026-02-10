import pdf from 'pdf-parse';
import path from 'path';

// Używamy tego samego interfejsu co parser TXT
export interface ParsedGlassOrderPdf {
  metadata: {
    orderDate: Date;
    glassOrderNumber: string;
    supplier: string;
    orderedBy: string;
    expectedDeliveryDate: Date | null;
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

/**
 * Wyciąga numer zlecenia z nazwy pliku PDF
 * Przykład: "53731 AKR SZPROSY 10 LUTY.pdf" → "53731"
 */
function extractOrderNumberFromFilename(filename: string): string {
  const basename = path.basename(filename, '.pdf');
  // Szukamy pierwszego ciągu cyfr na początku nazwy
  const match = basename.match(/^(\d+)/);
  if (match) {
    return match[1];
  }
  // Fallback - szukamy dowolnego numeru w nazwie
  const anyNumber = basename.match(/(\d{4,6})/);
  return anyNumber ? anyNumber[1] : basename;
}

/**
 * Wyciąga notatkę o typie zamówienia z nazwy pliku (SZPROSY, itp.)
 * Przykład: "53731 AKR SZPROSY 10 LUTY.pdf" → "Zam. - szprosy"
 * Używane do ustawienia pola orderedBy w zamówieniu szyb
 */
function extractGlassTypeNoteFromFilename(filename: string): string | null {
  const basename = path.basename(filename, '.pdf').toUpperCase();

  // Szukamy znanych typów - zwracamy notatkę w formacie "Zam. - typ"
  if (basename.includes('SZPROSY') || basename.includes('SZPROS')) {
    return 'Zam. - szprosy';
  }

  return null;
}

/**
 * Parsuje datę z PDF (format: DD.MM.YYYY lub inne)
 */
function parseDate(dateStr: string): Date {
  // Format DD.MM.YYYY
  const dotMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) {
    return new Date(
      parseInt(dotMatch[3]),
      parseInt(dotMatch[2]) - 1,
      parseInt(dotMatch[1])
    );
  }

  // Format YYYY-MM-DD
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(
      parseInt(isoMatch[1]),
      parseInt(isoMatch[2]) - 1,
      parseInt(isoMatch[3])
    );
  }

  return new Date();
}

/**
 * Wyciąga szerokość z wartości powierzchni
 * Format w PDF: "0,68679 x 1001" gdzie:
 * - "0,68679" to powierzchnia w m², ale ostatnie 3 cyfry (679) to szerokość w mm
 * - "1001" to wysokość w mm
 *
 * Alternatywnie oblicza: szerokość = powierzchnia * 1000000 / wysokość
 */
function extractWidthFromArea(areaStr: string, heightMm: number): number {
  // Usuń przecinek/kropkę i weź ostatnie 3 cyfry jako szerokość
  const cleanArea = areaStr.replace(/[,\.]/g, '');

  // Ostatnie 3 cyfry to szerokość
  if (cleanArea.length >= 3) {
    const widthFromDigits = parseInt(cleanArea.slice(-3));
    if (widthFromDigits >= 100 && widthFromDigits <= 9999) {
      return widthFromDigits;
    }
  }

  // Fallback: oblicz szerokość z powierzchni
  const areaValue = parseFloat(areaStr.replace(',', '.'));
  if (!isNaN(areaValue) && heightMm > 0) {
    // area_m2 = width_mm * height_mm / 1000000
    // width_mm = area_m2 * 1000000 / height_mm
    const calculatedWidth = Math.round(areaValue * 1000000 / heightMm);
    if (calculatedWidth >= 100 && calculatedWidth <= 9999) {
      return calculatedWidth;
    }
  }

  return 0;
}

/**
 * Parsuje plik PDF zamówienia szyb
 * Format: WH-Okna (dostawcy: IGP, Pilkington, Press Glass, itp.)
 *
 * Struktura tekstu z PDF:
 * ```
 * 1.                      ← numer pozycji na osobnej linii
 * 0,68679 x 1001          ← powierzchnia x wysokość
 * 4/16/4S3 Ug=1.1 ALU     ← typ szyby
 * 124                     ← kod (ignorowany)
 * ```
 *
 * @param fileContent - Buffer z zawartością PDF
 * @param filename - Nazwa pliku (używana do wyciągnięcia orderNumber)
 */
export async function parseGlassOrderPdf(
  fileContent: Buffer,
  filename: string
): Promise<ParsedGlassOrderPdf> {
  // Parsuj PDF
  const pdfData = await pdf(fileContent);
  const text = pdfData.text;
  const lines = text.split('\n').map(l => l.trim());

  // Wyciągnij numer zlecenia z nazwy pliku
  const orderNumber = extractOrderNumberFromFilename(filename);

  // Wyciągnij notatkę o typie zamówienia z nazwy pliku (np. "Zam. - szprosy")
  const glassTypeNote = extractGlassTypeNoteFromFilename(filename);

  // Szukaj numeru zamówienia szyb (glassOrderNumber)
  // Format: "Zamówienie na szyby  53731" lub "Zamówienie na szyby 53956-a"
  // Obsługuje sufixy typu "-a", "-b" itp.
  let glassOrderNumber = '';
  const orderMatch = text.match(/Zam[oó]wienie\s+na\s+szyby\s+(\d+(?:-[a-zA-Z])?)/i);
  if (orderMatch) {
    glassOrderNumber = orderMatch[1];
  } else {
    // Fallback - użyj numeru z nazwy pliku
    glassOrderNumber = orderNumber;
  }

  // Szukaj dostawcy (supplier)
  // W tym formacie PDF dostawca jest na początku (np. "IGP")
  let supplier = 'NIEZNANY';
  // Sprawdź pierwsze kilka linii na obecność nazwy dostawcy
  const supplierPatterns = ['IGP', 'PILKINGTON', 'PRESS GLASS', 'SAINT-GOBAIN', 'GUARDIAN'];
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].toUpperCase();
    for (const pattern of supplierPatterns) {
      if (line.includes(pattern)) {
        supplier = pattern;
        break;
      }
    }
    if (supplier !== 'NIEZNANY') break;
  }

  // Szukaj daty wydruku
  // Format: "Data wydruku DD.MM.YYYY" lub "Strona X / Y, Data wydruku DD.MM.YYYY"
  let orderDate = new Date();
  const dateMatch = text.match(/Data\s+wydruku\s+(\d{1,2}\.\d{1,2}\.\d{4})/i);
  if (dateMatch) {
    orderDate = parseDate(dateMatch[1]);
  }

  // Parsuj pozycje - nowy algorytm
  // Szukamy linii z samym numerem pozycji (np. "1.")
  // Następna linia ma format: "POWIERZCHNIA x WYSOKOŚĆ" (np. "0,68679 x 1001")
  // Kolejna linia to typ szyby (np. "4/16/4S3 Ug=1.1 ALU")
  const items: ParsedGlassOrderPdf['items'] = [];
  const orderBreakdown: Record<string, { count: number; quantity: number }> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Szukamy linii z samym numerem pozycji: "1." lub "12."
    const positionMatch = line.match(/^(\d+)\.\s*$/);
    if (!positionMatch) continue;

    const position = positionMatch[1];

    // Następna linia powinna mieć wymiary: "0,68679 x 1001"
    if (i + 1 >= lines.length) continue;
    const dimensionLine = lines[i + 1];

    // Pattern dla wymiarów: POWIERZCHNIA x WYSOKOŚĆ
    // Np: "0,68679 x 1001" lub "0,89886 x 1001"
    const dimMatch = dimensionLine.match(/^(\d+[,\.]\d+)\s*x\s*(\d+)\s*$/i);
    if (!dimMatch) continue;

    const areaStr = dimMatch[1];
    const heightMm = parseInt(dimMatch[2]);

    // Wyciągnij szerokość z powierzchni
    const widthMm = extractWidthFromArea(areaStr, heightMm);

    if (widthMm < 100 || heightMm < 100) continue;

    // Kolejna linia to typ szyby: "4/16/4S3 Ug=1.1 ALU"
    if (i + 2 >= lines.length) continue;
    const glassTypeLine = lines[i + 2];

    // Typ szyby powinien zawierać wzorzec N/N/N
    const glassTypeMatch = glassTypeLine.match(/(\d+\/\d+\/\d+\S*)/);
    if (!glassTypeMatch) continue;

    // Pełny typ szyby (np. "4/16/4S3 Ug=1.1 ALU")
    const glassType = glassTypeLine.trim();

    // Ilość = 1 (każda pozycja to 1 szyba w tym formacie)
    const quantity = 1;

    // Użyj glassOrderNumber z treści PDF (ma sufiks np. "-a")
    // Fallback do orderNumber z nazwy pliku tylko gdy brak w treści
    const effectiveOrderNumber = glassOrderNumber || orderNumber;

    items.push({
      glassType,
      quantity,
      widthMm,
      heightMm,
      position,
      orderNumber: effectiveOrderNumber,
      fullReference: `${effectiveOrderNumber} poz.${position}`,
    });

    // Dodaj do breakdown
    if (!orderBreakdown[effectiveOrderNumber]) {
      orderBreakdown[effectiveOrderNumber] = { count: 0, quantity: 0 };
    }
    orderBreakdown[effectiveOrderNumber].count++;
    orderBreakdown[effectiveOrderNumber].quantity += quantity;
  }

  // Jeśli brak pozycji, rzuć błąd
  if (items.length === 0) {
    throw new Error(`Nie znaleziono pozycji szyb w pliku PDF: ${filename}`);
  }

  return {
    metadata: {
      orderDate,
      glassOrderNumber,
      supplier,
      orderedBy: glassTypeNote || '', // Notatka z nazwy pliku (np. "Zam. - szprosy")
      expectedDeliveryDate: null, // Brak daty dostawy szyb w PDF
    },
    items,
    summary: {
      totalItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      orderBreakdown,
    },
  };
}
