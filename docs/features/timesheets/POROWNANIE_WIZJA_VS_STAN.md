# Porównanie: Stan obecny vs Wizja docelowa modułu godzinówek

Data: 2026-01-14

---

## 📅 1. Kalendarz miesięczny

| Aspekt | Mamy teraz | Wizja docelowa |
|--------|------------|----------------|
| Kolory statusu | 🟢 kompletny / 🟡 częściowy / ⚪ pusty | 🟢 wypełniony / 🟡 auto / 🔴 brak |
| Mini-info | liczba wpisów / liczba pracowników | liczba pracowników + suma godzin + **szklenia/skrzydła** + **jednostki/h** |
| Long-press menu | ❌ brak | ✅ oznacz jako wolny/przestój/święto |

**Brakuje:** Danych produkcyjnych (szklenia, skrzydła, jednostki/h) w kalendarzu + menu kontekstowe.

---

## 📋 2. Widok dnia - lista pracowników

| Aspekt | Mamy teraz | Wizja docelowa |
|--------|------------|----------------|
| Kolumny | Pracownik / Stanowisko / Produkcja / Nieprodukcja / Suma | + **Struktura godzin** (np. "9h prod / 3h palety") |
| Status wizualny | Kropka (zielona/szara) + kolor tła dla nieobecności | 🟢/🟡/🔴 z legendą (standard/wyjątek/brak) |
| Klikalne | Każdy wiersz | Tylko 🟡 lub 🔴 (oszczędność kliknięć) |

**Brakuje:** Kolumny "Struktura" i logiki "klikaj tylko problemy".

---

## 👤 3. Panel boczny pracownika

| Aspekt | Mamy teraz | Wizja docelowa |
|--------|------------|----------------|
| Godziny produkcyjne | ✅ Input | ✅ Bez zmian |
| Godziny nieprodukcyjne | Lista zadań + godziny | **Edytowalna lista** z "➕ Dodaj zadanie" |
| Nietypówki | ✅ SpecialWorks (oddzielna sekcja) | **Checkbox** → pokazuje pola |
| Nieobecności | ✅ Przyciski (Choroba/Urlop/Nieob.) | ✅ Mamy |
| Mikro-feedback | ❌ Brak | ✅ "22% nieprodukcji, Palety: 6h ↑" |

**Brakuje:** Dynamicznego "Dodaj zadanie" i mikro-feedbacku po zapisie.

---

## 📊 4. Widok tygodnia

| Aspekt | Mamy teraz | Wizja docelowa |
|--------|------------|----------------|
| Istnieje? | ❌ Nie | ✅ Podgląd (bez edycji) |
| Zawartość | - | Sumy, jednostki/h, trendy ↑↓ |

**Brakuje:** Zupełnie brakuje widoku tygodniowego.

---

## ⚡ 5. Szybkie akcje

| Aspekt | Mamy teraz | Wizja docelowa |
|--------|------------|----------------|
| "Ustaw standardowy dzień" | ✅ Mamy (z localStorage) | ✅ Podobne |
| "Zastosuj wzorzec dnia" | ❌ Brak | ✅ Kopiowanie z innego dnia |
| "Oznacz dzień jako wolny" | ❌ Brak (tylko per pracownik) | ✅ Dla wszystkich naraz |

**Brakuje:** Wzorców i masowego oznaczania wolnego.

---

## 👥 6. Zarządzanie pracownikami

| Aspekt | Mamy teraz | Wizja docelowa |
|--------|------------|----------------|
| Lista | ✅ Mamy | ✅ OK |
| Profil pracownika | Imię, nazwisko, stanowisko domyślne, aktywny | + **stanowiska możliwe** (checkboxy) + **historia zmian** |

**Brakuje:** Multi-stanowisk i historii.

---

## 📚 7. Słowniki (Typy nieprodukcji)

| Aspekt | Mamy teraz | Wizja docelowa |
|--------|------------|----------------|
| Pola | Nazwa, kolejność, aktywne | + **typ** (logistyka/pomocnicze) + **wyklucza wydajność** |

**Brakuje:** Kategorii zadań i flagi "wyklucza wydajność".

---

## 📝 Podsumowanie głównych braków

| # | Funkcjonalność | Priorytet | Opis |
|---|----------------|-----------|------|
| 1 | **Jednostki/h** | Wysoki | Integracja z danymi produkcyjnymi (szklenia, skrzydła) |
| 2 | **Widok tygodnia** | Średni | Podgląd sum, trendów bez edycji |
| 3 | **Wzorce dni** | Średni | Kopiowanie konfiguracji z innego dnia |
| 4 | **Multi-stanowiska pracownika** | Niski | Jeden domyślny, ale może pracować na kilku |
| 5 | **Mikro-feedback** | Niski | Świadomość operacyjna po zapisie |
| 6 | **Kategorie zadań nieprodukcyjnych** | Niski | Typ + flaga "wyklucza wydajność" |
| 7 | **Menu kontekstowe w kalendarzu** | Niski | Wolne/święto/przestój dla całego dnia |

---

## ✅ Co już mamy (zrealizowane)

- [x] Kalendarz miesięczny z podstawowymi statusami
- [x] Widok dnia z listą pracowników
- [x] Panel boczny do edycji godzin
- [x] Godziny produkcyjne i nieprodukcyjne
- [x] Nietypówki (SpecialWorks)
- [x] Nieobecności (Choroba/Urlop/Nieobecność)
- [x] Dialog pytający o cały tydzień (dla Choroba/Urlop na poniedziałek)
- [x] "Ustaw standardowy dzień" z zapamiętywaniem w localStorage
- [x] Zarządzanie pracownikami (CRUD)
- [x] Zarządzanie stanowiskami (CRUD)
- [x] Zarządzanie typami nieprodukcji (CRUD)
- [x] Zarządzanie typami nietypówek (CRUD)

---

## 🎯 Rekomendowane kolejne kroki

1. **Jednostki/h** - wymaga integracji z modułem zleceń/produkcji
2. **Widok tygodnia** - relatywnie prosty do dodania
3. **Wzorce dni** - UX convenience, średni effort
4. **Multi-stanowiska** - wymaga zmian w schemacie bazy

---

*Dokument wygenerowany automatycznie na podstawie analizy stanu projektu.*
