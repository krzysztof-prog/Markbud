# Lessons Learned - Imports & Parsing

> Błędy związane z importem danych i parsowaniem plików.

---

## 2025-12-XX - Import "successful" ale 150 wierszy znikło

**Co się stało:**
Użytkownik zaimportował CSV z 500 zleceniami. System pokazał "Import successful!". Po tygodniu odkryto że w bazie jest tylko 350 zleceń - **150 zniknęło bez śladu**.

**Root cause:**
`csv-parser.ts` miał logikę:
```typescript
// Problematyczny kod
for (const row of rows) {
  const color = await findColorByCode(row.colorCode);
  if (!color) {
    console.warn(`Kolor ${row.colorCode} nie znaleziony`); // <- tylko log!
    continue; // <- pomija wiersz BEZ informacji użytkownika
  }
  // ... dalsze przetwarzanie
}

return { success: true }; // <- ZAWSZE "success"!
```

**Impact:**
- Średni: 150 zleceń musiało być ręcznie dodanych
- Opóźnienia w produkcji (zlecenia nie były widoczne)
- Utrata zaufania użytkowników do importu
- Ręczne porównywanie CSV z bazą (4 godziny pracy!)

**Fix:**
```typescript
// Naprawiony kod
const errors: ImportError[] = [];
let successCount = 0;

for (const [index, row] of rows.entries()) {
  const color = await findColorByCode(row.colorCode);
  if (!color) {
    errors.push({
      row: index + 1,
      field: 'color',
      value: row.colorCode,
      reason: `Kolor "${row.colorCode}" nie istnieje w bazie`
    });
    continue;
  }
  // ... przetwarzanie
  successCount++;
}

return {
  success: successCount,
  failed: errors.length,
  total: rows.length,
  errors: errors
};
```

Frontend pokazuje:
```typescript
if (result.failed > 0) {
  toast({
    variant: 'warning',
    title: `Zaimportowano ${result.success}/${result.total} wierszy`,
    description: `${result.failed} wierszy pominięto. Kliknij aby pobrać raport błędów.`
  });
}
```

**Prevention:**
1. KAŻDY import zwraca `{ success, failed, errors[] }`
2. Frontend pokazuje dialog z podsumowaniem
3. Możliwość pobrania CSV z błędnymi wierszami
4. Dodano do [COMMON_MISTAKES.md](COMMON_MISTAKES.md) sekcję "Importy i parsowanie"

**Lekcja:** **NIGDY nie zakładaj że operacja się udała**. Zawsze raportuj użytkownikowi co się faktycznie wydarzyło (success count, failed count, errors).

---

[Powrót do indeksu](../../LESSONS_LEARNED.md)
