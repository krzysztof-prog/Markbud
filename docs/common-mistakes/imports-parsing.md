# Importy i parsowanie

[< Powrot do spisu tresci](README.md)

---

## DON'T - Cicho pomijaj bledy importu

```typescript
// ZLE - uzytkownik nie wie ze cos pominieto
if (!color) {
  console.warn('Kolor nie znaleziony');
  continue; // wiersz zniknal bez sladu!
}
```

**Konsekwencja:** "Import successful!" ale 150/500 wierszy zniknelo. Odkryto po miesiacu.

---

## DO - Zbieraj bledy i raportuj uzytkownikowi

```typescript
// POPRAWNIE
const errors: ImportError[] = [];
const successCount = 0;

for (const [index, row] of rows.entries()) {
  if (!row.color) {
    errors.push({
      row: index + 1,
      field: 'color',
      value: row.colorCode,
      reason: `Kolor "${row.colorCode}" nie istnieje w bazie`
    });
    continue;
  }
  // ... proces wiersza
  successCount++;
}

// Zwroc raport
return {
  success: successCount,
  failed: errors.length,
  total: rows.length,
  errors: errors
};

// Frontend: Pokaz uzytkownikowi
if (result.failed > 0) {
  toast({
    variant: 'warning',
    title: `Zaimportowano ${result.success}/${result.total} wierszy`,
    description: `${result.failed} wierszy pominieto. Kliknij aby pobrac raport.`,
    action: <Button onClick={downloadErrorReport}>Pobierz raport</Button>
  });
}
```

**Gdzie sprawdzic:** [apps/api/src/services/parsers/csv-parser.ts](../../apps/api/src/services/parsers/csv-parser.ts)

---

## Kluczowe zasady

1. **Zbieraj bledy** - tworzysz tablice `errors[]`
2. **Kontynuuj import** - nie przerywaj przy pierwszym bledzie
3. **Raportuj uzytkownikowi** - pokaz ile sie udalo/nie udalo
4. **Umozliw pobranie raportu** - lista bledow do pobrania jako CSV

---

## Struktura ImportError

```typescript
interface ImportError {
  row: number;       // numer wiersza (1-indexed)
  field: string;     // nazwa pola z bledem
  value: string;     // wartosc ktora spowodowala blad
  reason: string;    // czytelny opis bledu po polsku
}
```

---

[< Powrot do spisu tresci](README.md)
