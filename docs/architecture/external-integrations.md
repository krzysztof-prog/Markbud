# External Integrations

> Dokumentacja integracji z zewnetrznymi systemami.

---

## Schuco Connect

**Cel:** Pobieranie zamowien i dostaw z systemu Schuco.

**Technologia:** Puppeteer (headless browser automation)

### Konfiguracja (.env)

```env
SCHUCO_EMAIL=email@firma.pl
SCHUCO_PASSWORD=haslo
SCHUCO_BASE_URL=https://connect.schueco.com/schueco/pl/
SCHUCO_HEADLESS=true
```

### Przeplyw

```
┌─────────────────┐
│  Puppeteer      │
│  (headless)     │
└───────┬─────────┘
        │
        │ 1. Login do Schuco Connect
        ▼
┌─────────────────┐
│  Schuco Portal  │
│  (login page)   │
└───────┬─────────┘
        │
        │ 2. Nawigacja do strony zamowien
        ▼
┌─────────────────┐
│  Orders Page    │
│  (z filtrem dat)│
└───────┬─────────┘
        │
        │ 3. Download CSV (klik export)
        ▼
┌─────────────────┐
│  CSV Parser     │
│  (separator ;)  │
└───────┬─────────┘
        │
        │ 4. Upsert do bazy
        ▼
┌─────────────────┐
│  schuco_        │
│  deliveries     │
└─────────────────┘
```

### Kroki scrapera

1. **Login** - wypelnienie formularza logowania
2. **Navigate** - przejscie do strony zamowien z filtrem dat
3. **Wait** - oczekiwanie na zaladowanie danych (dynamiczne)
4. **Export** - klikniecie przycisku eksportu CSV
5. **Download** - pobranie pliku CSV
6. **Parse** - parsowanie CSV (separator `;`, encoding UTF-8)
7. **Save** - upsert do tabeli `schuco_deliveries`

### Wyzwania

| Wyzwanie | Rozwiazanie |
|----------|-------------|
| Dynamiczne ladowanie | Wait strategies (waitForSelector, waitForNavigation) |
| CAPTCHA | Reczna interwencja (headless=false) |
| Session timeout | Odswiezanie sesji, retry logic |
| Zmiany w portalu | Selektory w konfiguracji, monitoring |

### Wyswietlane Kolumny

- Data zamowienia
- Nr zamowienia
- Zlecenie
- Status wysylki
- Tydzien dostawy
- Rodzaj zamowienia
- Suma

### API Endpoints

```
GET    /api/schuco/deliveries   # Lista dostaw Schuco
POST   /api/schuco/refresh      # Odswiez dane (uruchom scraper)
GET    /api/schuco/status       # Status ostatniego pobrania
GET    /api/schuco/logs         # Historia pobieran
```

---

## Google Calendar API

**Cel:** Synchronizacja dat dostaw z kalendarzem Google.

### Funkcje

- **Create** - tworzenie eventow dla nowych dostaw
- **Update** - aktualizacja eventow przy zmianie daty
- **Delete** - usuwanie eventow przy anulowaniu dostawy

### Przeplyw

```
┌─────────────────┐
│  Delivery       │
│  Created/Updated│
└───────┬─────────┘
        │
        │ Hook: afterDeliveryChange
        ▼
┌─────────────────┐
│  Calendar       │
│  Service        │
└───────┬─────────┘
        │
        │ Google Calendar API
        ▼
┌─────────────────┐
│  Google         │
│  Calendar       │
└─────────────────┘
```

### Przykladowe uzycie

```typescript
// services/calendarService.ts
export class CalendarService {
  async createDeliveryEvent(delivery: Delivery) {
    const event = {
      summary: `Dostawa #${delivery.deliveryNumber}`,
      description: `Zlecenia: ${delivery.orders.map(o => o.orderNumber).join(', ')}`,
      start: { date: delivery.deliveryDate },
      end: { date: delivery.deliveryDate }
    };

    return calendar.events.insert({
      calendarId: 'primary',
      requestBody: event
    });
  }
}
```

---

## PDF Generation

**Cel:** Eksport dokumentow (protokoly, raporty).

**Biblioteka:** PDFKit

### Generowane Dokumenty

| Dokument | Opis | Endpoint |
|----------|------|----------|
| Protokol dostawy | Lista zlecen, okna, szyby | `GET /api/deliveries/:id/protocol` |
| Layout palety | Wizualizacja pakowania | `GET /api/deliveries/:id/pallet-layout` |
| Raport miesieczny | Zestawienie zlecen | `GET /api/reports/monthly/:year/:month` |
| Raport magazynowy | Stan magazynu profili | `GET /api/warehouse/report` |

### Przyklad generowania PDF

```typescript
// services/pdfService.ts
import PDFDocument from 'pdfkit';

export function generateDeliveryProtocol(delivery: DeliveryWithOrders): Buffer {
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  // Naglowek
  doc.fontSize(20).text(`Protokol dostawy #${delivery.deliveryNumber}`);
  doc.fontSize(12).text(`Data: ${delivery.deliveryDate}`);

  // Lista zlecen
  doc.moveDown();
  doc.fontSize(14).text('Zlecenia:');

  delivery.orders.forEach((order, i) => {
    doc.fontSize(10).text(`${i + 1}. ${order.orderNumber} - ${order.client}`);
  });

  doc.end();

  return Buffer.concat(chunks);
}
```

---

## File Watcher (Import automatyczny)

**Cel:** Automatyczne importowanie plikow z folderow sieciowych.

### Obserwowane Foldery

| Folder | Typ pliku | Akcja |
|--------|-----------|-------|
| `uzyte_bele/` | CSV | Import zuzycia profili |
| `uzyte_bele_prywatne/` | CSV | Import zuzycia prywatnych |
| `ceny/` | CSV | Import cen |
| `dostawy_szyb/` | CSV/Excel | Import dostaw szyb |

### Konfiguracja (.env)

```env
# DEV - lokalne foldery testowe
WATCH_FOLDER_UZYTE_BELE=C:/DEV_DATA/uzyte_bele
WATCH_FOLDER_CENY=C:/DEV_DATA/ceny

# PROD - foldery sieciowe
WATCH_FOLDER_UZYTE_BELE=//192.168.1.6/Public/Markbud_import/uzyte_bele
WATCH_FOLDER_CENY=//192.168.1.6/Public/Markbud_import/ceny
```

### Przeplyw

```
┌─────────────────┐
│  File Watcher   │
│  (chokidar)     │
└───────┬─────────┘
        │
        │ Wykrycie nowego pliku
        ▼
┌─────────────────┐
│  Import Service │
│  (parser)       │
└───────┬─────────┘
        │
        │ Parsowanie + walidacja
        ▼
┌─────────────────┐
│  Database       │
│  (upsert)       │
└───────┬─────────┘
        │
        │ Przeniesienie pliku
        ▼
┌─────────────────┐
│  processed/     │
│  lub error/     │
└─────────────────┘
```

---

## Powiazane Dokumenty

- [Backend Architecture](./backend.md)
- [Communication Flow](./communication-flow.md)
- [Security Model](./security.md)

---

**Ostatnia aktualizacja:** 2026-01-20
