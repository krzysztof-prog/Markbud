# Plan Implementacji Funkcji Remanent (Inwentaryzacja Magazynu)

## 🎯 Cel
Stworzenie kompletnego interfejsu użytkownika dla funkcji remanentowej (miesięcznej inwentaryzacji magazynu), która pozwoli na:
- Porównanie stanu obliczonego ze stanem rzeczywistym
- Wprowadzenie stanów faktycznych
- Zapisanie remanetu
- Przeglądanie historii
- Cofnięcie ostatniego remanentu

## 📊 Analiza Obecnego Stanu

### Backend (✅ Gotowy)
- **POST /api/warehouse/monthly-update** - wykonanie remanentowania
- **POST /api/warehouse/rollback-inventory** - cofnięcie ostatniej inwentaryzacji
- **GET /api/warehouse/history/:colorId** - historia remanentów
- Model `WarehouseHistory` z polami: calculatedStock, actualStock, difference

### Frontend (❌ Brak implementacji)
- Brak UI dla funkcji remanentowej
- Typy TypeScript częściowo przygotowane w `MonthlyStockUpdate`
- API helper przygotowany w `warehouseApi.monthlyUpdate()`

## 🤔 Pytania do Użytkownika

Przed zaprojektowaniem szczegółowego planu potrzebuję wyjaśnić kilka rzeczy:

### 1. **Umiejscowienie funkcji remanent - gdzie ma się znajdować?**

Analizuję trzy możliwe podejścia:

#### Opcja A: Trzecia zakładka "Remanent" na stronie /magazyn/akrobud
- ✅ Prosta implementacja - dodanie jednej zakładki do istniejących Tabs
- ✅ Użytkownik nie musi przechodzić do nowej strony
- ✅ Kontekst koloru już wybrany
- ❌ Może być zatłoczone jeśli funkcja będzie rozbudowana
- ❌ Historia i rollback mogą nie pasować jako podsekcje zakładki

#### Opcja B: Modal/Dialog otwarty z zakładki "Stan magazynowy"
- ✅ Nie zmienia struktury nawigacji
- ✅ Skupienie uwagi na zadaniu
- ❌ Ograniczona przestrzeń ekranu dla dużej ilości danych
- ❌ Ciężko porównywać wiele profili jednocześnie
- ❌ Historia wymagałaby oddzielnego widoku

#### Opcja C: Osobna strona /magazyn/akrobud/remanent
- ✅ Pełna przestrzeń na skomplikowany interfejs
- ✅ Naturalne miejsce na historię jako podsekcję
- ✅ Zgodne z wzorcem Next.js routing
- ✅ Łatwe rozszerzanie w przyszłości
- ❌ Dodatkowy poziom nawigacji

**Moja rekomendacja:** Opcja C - osobna strona, bo:
- Remanent to oddzielny, ważny proces biznesowy (nie zwykła edycja)
- Wymaga dużo miejsca na tabelę porównawczą
- Historia i rollback naturalnie pasują jako sekcje na dedykowanej stronie

### 2. **Workflow użytkownika - jak ma wyglądać proces?**

**Wariant 1: Wszystkie profile jednocześnie (batch mode)**
```
1. Użytkownik przechodzi do /magazyn/akrobud/remanent
2. Widzi tabelę ze WSZYSTKIMI profilami dla wybranego koloru:
   - Kolumna: Profil (nr profilu)
   - Kolumna: Stan obliczony (currentStockBeams)
   - Kolumna: Stan rzeczywisty (pole INPUT)
   - Kolumna: Różnica (automatycznie wyliczana)
3. Wypełnia wszystkie pola INPUT
4. Klika "Zatwierdź remanent" - zapisuje wszystko jednym API call
```

**Wariant 2: Profil po profilu**
```
1. Wybiera profil z listy
2. Widzi szczegóły tego jednego profilu
3. Wprowadza stan
4. Zapisuje pojedynczy profil
5. Przechodzi do kolejnego
```

**Pytanie:** Który wariant bardziej odpowiada rzeczywistemu procesowi inwentaryzacji w magazynie?

### 3. **Historia remanentów - jak ma być wyświetlana?**

**Opcja A:** Druga zakładka na stronie /magazyn/akrobud/remanent
- Tab 1: "Nowy remanent"
- Tab 2: "Historia"

**Opcja B:** Sekcja pod formularzem na tej samej stronie
```
[Formularz nowego remanentu]
─────────────────────────────
[Historia ostatnich remanentów - rozwijana lista]
```

**Opcja C:** Osobna podstrona /magazyn/akrobud/remanent/historia

### 4. **Rollback - jak ma działać?**

**Scenariusz:** Użytkownik popełnił błąd podczas remanentowania i chce cofnąć.

**Opcja A:** Przycisk "Cofnij ostatni remanent" widoczny w historii
**Opcja B:** Przycisk przy każdym wpisie w historii (tylko najnowszy aktywny)
**Opcja C:** Osobne potwierdzenie w modalu przed cofnięciem

### 5. **Wybór koloru - jak ma działać?**

**Opcja A:** Sidebar z kolorami (jak na /magazyn/akrobud)
- Użytkownik wybiera kolor z sidebar
- Widzi remanent dla tego koloru
- Może przełączać między kolorami

**Opcja B:** Dropdown/Select na górze strony
- Prostsza implementacja
- Mniej miejsca zajmuje

**Opcja C:** Remanent dla wszystkich kolorów naraz
- Mega-tabela ze wszystkimi profilami i kolorami
- Może być przytłaczająca

## 📝 Następne Kroki

Po otrzymaniu odpowiedzi na powyższe pytania stworzę szczegółowy plan techniczny zawierający:

1. **Strukturę plików i komponentów**
2. **Aktualizację typów TypeScript**
3. **Implementację API helpers**
4. **Projekt interfejsu (wireframe tekstowy)**
5. **Plan implementacji krok po kroku**

---

## Pytania do użytkownika:

1. **Gdzie umieścić funkcję remanent?** (Opcja A/B/C z sekcji 1)
2. **Jak ma wyglądać workflow?** (Wariant 1/2 z sekcji 2)
3. **Jak wyświetlać historię?** (Opcja A/B/C z sekcji 3)
4. **Jak ma działać rollback?** (Opcja A/B/C z sekcji 4)
5. **Jak wybierać kolor?** (Opcja A/B/C z sekcji 5)