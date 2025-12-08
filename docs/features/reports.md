# Moduł Raportów - Dokumentacja

## Przegląd

Moduł raportów umożliwia generowanie różnych zestawień i eksportów danych z systemu.

## Funkcjonalności

### 1. Eksport PDF

**Biblioteka:** PDFKit

**Dostępne eksporty:**
- Protokół dostawy
- Plan pakowania palet
- Raporty miesięczne

**API:**
```typescript
GET /api/pallets/export/:deliveryId  // PDF optymalizacji palet
GET /api/reports/monthly/:year/:month // Raport miesięczny
```

### 2. Raporty Miesięczne

**Zawartość:**
- Podsumowanie produkcji
- Statystyki dostaw
- Zużycie materiałów
- Zestawienie zleceń

**Filtry:**
- Rok/miesiąc
- Typ zlecenia
- Klient

### 3. Statystyki Profili

**Wykresy:**
- Zużycie profili w czasie
- Rozkład kolorów
- Top 10 profili

**Dane:**
- Ilość zamówionych/zużytych bel
- Średnie zużycie dzienne
- Trendy miesięczne

---

## Struktura Plików

```
apps/api/src/
├── services/
│   └── reports/
│       ├── MonthlyReportService.ts
│       └── ProfileStatsService.ts
└── routes/
    └── reports.ts

apps/web/src/
└── app/
    └── raporty/
        ├── page.tsx
        └── miesieczne/
            └── page.tsx
```

---

## API Endpoints

```typescript
// Raporty miesięczne
GET  /api/reports/monthly/:year/:month
POST /api/reports/monthly/generate

// Statystyki profili
GET  /api/reports/profiles/stats
GET  /api/reports/profiles/usage/:profileId

// Eksporty
GET  /api/reports/export/pdf/:reportId
GET  /api/reports/export/excel/:reportId
```

---

## Konfiguracja PDF

### Stylizacja
```typescript
const PDF_CONFIG = {
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  fonts: {
    header: 'Helvetica-Bold',
    body: 'Helvetica'
  },
  colors: {
    primary: '#2563eb',
    header: '#4b5563',
    border: '#d1d5db'
  }
};
```

---

## Powiązane dokumenty

Oryginalne pliki (zarchiwizowane w `docs/archive/`):
- PDF_EXPORT_IMPLEMENTATION.md
- MONTHLY_REPORTS_FEATURE.md
- MONTHLY_REPORTS_DOCUMENTATION.md
- PROFILE_STATS_FEATURE.md
