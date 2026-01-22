# Propozycje Nowych Funkcjonalności dla AKROBUD

> **Data utworzenia:** 2026-01-21
> **Status:** Propozycje do dyskusji
> **Autor:** Claude (na podstawie analizy codebase)

---

## Spis treści

1. [Podsumowanie](#podsumowanie)
2. [Innowacyjne Funkcjonalności](#innowacyjne-funkcjonalności)
3. [Priorytetyzacja](#priorytetyzacja)
4. [Szczegóły implementacji](#szczegóły-implementacji)

---

## Podsumowanie

Na podstawie analizy istniejącego codebase AKROBUD (78 modeli Prisma, 20+ modułów funkcjonalnych), przygotowano listę **kreatywnych, nowych funkcjonalności**, których nie ma w żadnym istniejącym planie.

### Co już istnieje:
- ✅ Zlecenia (Orders) z importem CSV
- ✅ Dostawy AKROBUD + Schuco
- ✅ Magazyny: PVC/ALU, Okucia, Stal, Szyby
- ✅ Zestawienia produkcji
- ✅ Kontrola etykiet (OCR)
- ✅ Panel kierownika (częściowo)
- ✅ Godzinówki (backend gotowy)
- ✅ Paletówki

### Czego brakuje:
- ❌ Prognozowanie i analityka
- ❌ Portal dla klientów
- ❌ Inteligentne powiadomienia
- ❌ Dokumentacja zdjęciowa
- ❌ Optymalizacja kosztów
- ❌ Serwis maszyn
- ❌ Macierz umiejętności pracowników

---

## Innowacyjne Funkcjonalności

### 1. Smart Predictions - Moduł Prognozowania

**Czego jeszcze nie ma:**
- Przewidywanie zapotrzebowania na materiały na podstawie historii
- Sugestie zamówień (AI: "Za 2 tygodnie zabraknie Ci szyb 4mm")
- Analiza sezonowości (więcej okien wiosną/latem)

**Jak by działało:**
```
📊 Dashboard prognoz:
- "Prognoza na marzec: ~280 zleceń (↑15% vs luty)"
- "Zalecane zamówienie okuć: 500 sztuk zawiasów przed 15.03"
- "Alert: Profil RAL7016 spadnie poniżej minimum za 8 dni"
```

**Wartość biznesowa:** Mniej przestojów produkcji, optymalne zamówienia

---

### 2. Mobile Scanner - Aplikacja Magazynowa

**Czego jeszcze nie ma:**
- Skanowanie kodów kreskowych telefonem
- Szybkie wydania z magazynu
- Potwierdzanie dostaw w terenie

**Jak by działało:**
```
📱 Magazynier skanuje QR na profilu:
→ Wyświetla się: "Profil PVC 70mm Biały | Stan: 45 szt."
→ "Wydaj do zlecenia: [53455]" → Potwierdź
→ Automatyczna aktualizacja stanu
```

**Wartość biznesowa:** Szybsza praca magazynu, mniej błędów

---

### 3. Gamifikacja Produkcji - Leaderboard

**Czego jeszcze nie ma:**
- Ranking pracowników (okna/h, jakość)
- Odznaki za osiągnięcia
- Tygodniowe wyzwania

**Jak by działało:**
```
🏆 Tablica wyników (na TV w hali):
1. Kowalski - 47 okien/tydzień - 🥇
2. Nowak - 43 okna/tydzień - 🥈
3. Wiśniewski - 41 okien/tydzień - 🥉

🎖️ Odznaki:
- "Mistrz szkleń" - 100+ okien bez błędu
- "Terminowy" - 10 zleceń przed deadline
```

**Wartość biznesowa:** Motywacja pracowników, zdrowa rywalizacja

---

### 4. Digital Twin - Wizualizacja Hali

**Czego jeszcze nie ma:**
- Interaktywna mapa hali produkcyjnej
- Real-time status stanowisk
- Kto gdzie pracuje

**Jak by działało:**
```
🏭 Widok hali (2D/3D):
[Stanowisko 1] - Kowalski - Zlecenie 53455 - 70% ✅
[Stanowisko 2] - Nowak - Zlecenie 53460 - 30% 🔄
[Stanowisko 3] - WOLNE ⚪
[Magazyn] - Wiśniewski - Kompletowanie
```

**Wartość biznesowa:** Lepsza widoczność produkcji dla kierownictwa

---

### 5. Klient Portal - Samoobsługa

**Czego jeszcze nie ma:**
- Portal dla klientów do śledzenia zamówień
- "Gdzie jest moje zlecenie?" bez dzwonienia

**Jak by działało:**
```
🌐 klient.akrobud.pl/53455:
"Zlecenie #53455 - BUDOMEX Sp. z o.o."
├─ ✅ Przyjęte: 15.01.2026
├─ ✅ W produkcji: 18.01.2026
├─ ✅ Szyby zamówione: 19.01.2026
├─ 🔄 Produkcja: 75% (eta: 22.01)
└─ ⏳ Dostawa: planowana 25.01.2026
```

**Wartość biznesowa:** Mniej telefonów, lepsza obsługa klienta

---

### 6. Smart Alerts - Inteligentne Powiadomienia

**Czego jeszcze nie ma:**
- Kontekstowe alerty (nie "niski stan", ale "niski stan + masz 3 zlecenia czekające")
- Eskalacja (jeśli nikt nie zareagował w 2h → powiadom kierownika)
- Learning (uczenie się co jest ważne dla kogo)

**Jak by działało:**
```
🚨 Alert dla kierownika:
"Zlecenie 53470 opóźnione o 2 dni"
+ "Przyczyna: brak szyb (dostawa opóźniona)"
+ "Propozycja: Przesuń na 27.01 lub zamów ekspres"
[Przesuń] [Zamów ekspres] [Zadzwoń do klienta]
```

**Wartość biznesowa:** Szybsze reagowanie na problemy

---

### 7. Voice Assistant - Obsługa Głosowa

**Czego jeszcze nie ma:**
- Głosowe zapytania ("Jaki stan profilu 70mm biały?")
- Raporty głosowe dla kierownika
- Hands-free dla magazyniera

**Jak by działało:**
```
🎤 "Hej AKRO, jaki jest status zlecenia 53455?"
🔊 "Zlecenie 53455 dla BUDOMEX jest w produkcji,
    ukończone 14 z 20 okien, planowana dostawa piątek"
```

**Wartość biznesowa:** Szybszy dostęp do informacji bez komputera

---

### 8. Photo Documentation - Dokumentacja Zdjęciowa

**Czego jeszcze nie ma:**
- Zdjęcia każdego etapu produkcji
- Dowód jakości przed wysyłką
- Timeline wizualny zlecenia

**Jak by działało:**
```
📸 Zlecenie 53455 - Galeria:
[Materiał przyjęty] → [Po cięciu] → [Po składaniu]
→ [Szklenie] → [Gotowe] → [Załadunek]

+ OCR: automatyczne rozpoznawanie numeru zlecenia ze zdjęcia
```

**Wartość biznesowa:** Dowód jakości, mniej reklamacji

---

### 9. Cost Optimizer - Optymalizator Kosztów

**Czego jeszcze nie ma:**
- Analiza "co jeśli" (co jeśli zamówię więcej teraz?)
- Sugestie batch ordering
- Porównanie dostawców

**Jak by działało:**
```
💰 Sugestia oszczędności:
"Zamów 1000 zawiasów teraz zamiast 2x500:
 - Koszt 2x500: 2×800 PLN = 1600 PLN
 - Koszt 1x1000: 1400 PLN (-12.5%)
 - Oszczędność: 200 PLN
 - Miejsce w magazynie: OK (capacity 80%)"
[Zamów 1000] [Zostaw jak jest]
```

**Wartość biznesowa:** Realne oszczędności na zakupach

---

### 10. Maintenance Tracker - Serwis Maszyn

**Czego jeszcze nie ma:**
- Harmonogram przeglądów maszyn
- Historia awarii
- Predictive maintenance

**Jak by działało:**
```
🔧 Maszyny:
[Piła formatowa CNC]
├─ Ostatni przegląd: 01.12.2025
├─ Następny: 01.03.2026 (za 40 dni)
├─ Godziny pracy: 1847h
└─ Alert: Wymiana tarczy za ~200h

[Zgłoś problem] [Zaplanuj serwis]
```

**Wartość biznesowa:** Mniej nieplanowanych przestojów

---

### 11. Weather Integration - Pogoda a Dostawy

**Czego jeszcze nie ma:**
- Integracja z prognozą pogody
- Alerty "jutro mróz - okna mogą pęknąć przy transporcie"
- Sugestie przesunięcia dostaw

**Jak by działało:**
```
🌦️ Alert pogodowy:
"Prognoza na 25.01: -15°C, śnieg"
"Masz zaplanowane 3 dostawy z dużymi szybami"
"Rekomendacja: Przesuń dostawę 53470 (duże szyby)"
[Przesuń] [Ryzykuję]
```

**Wartość biznesowa:** Mniej uszkodzeń podczas transportu

---

### 12. Skill Matrix - Macierz Umiejętności

**Czego jeszcze nie ma:**
- Kto umie co robić
- Sugestie przydziału zleceń
- Planowanie szkoleń

**Jak by działało:**
```
👷 Macierz umiejętności:
             | Cięcie | Składanie | Szklenie | CNC |
Kowalski    |   ⭐⭐⭐  |    ⭐⭐⭐    |    ⭐⭐    |  ⭐  |
Nowak       |   ⭐⭐   |    ⭐⭐⭐    |    ⭐⭐⭐   |  ⭐⭐ |
Wiśniewski  |   ⭐    |    ⭐⭐     |    ⭐⭐⭐   | ⭐⭐⭐ |

🎯 Sugestia: Zlecenie 53470 (dużo CNC) → przydziel Wiśniewskiego
```

**Wartość biznesowa:** Optymalne przydzielanie zadań

---

## Priorytetyzacja

### TOP 5 Rekomendacji

| # | Funkcjonalność | Wartość biznesowa | Trudność | ROI |
|---|----------------|-------------------|----------|-----|
| 1 | **Klient Portal** | Mniej telefonów, lepsza obsługa | Średnia | ⭐⭐⭐⭐⭐ |
| 2 | **Smart Alerts** | Szybsze reagowanie na problemy | Średnia | ⭐⭐⭐⭐⭐ |
| 3 | **Photo Documentation** | Dowód jakości, mniej reklamacji | Niska | ⭐⭐⭐⭐ |
| 4 | **Mobile Scanner** | Szybsza praca magazynu | Średnia | ⭐⭐⭐⭐ |
| 5 | **Cost Optimizer** | Realne oszczędności | Wysoka | ⭐⭐⭐⭐ |

### Tier 1 - Quick Wins (1-2 tygodnie)

1. **Photo Documentation** - Prosta galeria zdjęć per zlecenie
2. **Smart Alerts** - Rozszerzenie istniejących powiadomień

### Tier 2 - Medium Effort (2-4 tygodnie)

3. **Klient Portal** - Osobna subdomena z read-only dostępem
4. **Mobile Scanner** - PWA z kamerą dla magazynierów
5. **Skill Matrix** - Nowy moduł w panelu admina

### Tier 3 - Major Features (1-2 miesiące)

6. **Smart Predictions** - ML na historycznych danych
7. **Cost Optimizer** - Integracja z cenami dostawców
8. **Maintenance Tracker** - Pełny moduł serwisowy

### Tier 4 - Long-term Vision (3+ miesiące)

9. **Digital Twin** - 2D/3D wizualizacja hali
10. **Voice Assistant** - Integracja z speech-to-text
11. **Gamifikacja** - System punktów i nagród
12. **Weather Integration** - API pogodowe + logika

---

## Szczegóły implementacji

### Klient Portal - Architektura

```
apps/
├── web/           # Główna aplikacja (istniejąca)
└── client-portal/ # Nowa aplikacja Next.js (read-only)
    ├── src/
    │   ├── app/
    │   │   ├── [orderNumber]/  # Dynamiczny routing
    │   │   │   └── page.tsx    # Status zlecenia
    │   │   └── page.tsx        # Landing + wyszukiwarka
    │   └── lib/
    │       └── api.ts          # Read-only API calls
```

**Wymagane zmiany w API:**
- Nowy endpoint: `GET /api/public/orders/:orderNumber/status`
- Token dostępu generowany przy tworzeniu zlecenia
- Rate limiting dla public API

### Smart Alerts - Model danych

```prisma
model Alert {
  id          String   @id @default(cuid())
  type        AlertType
  severity    AlertSeverity
  title       String
  message     String
  context     Json?    // Dodatkowe dane kontekstowe
  actionUrl   String?  // Link do akcji

  // Eskalacja
  escalatedAt DateTime?
  escalatedTo String?

  // Status
  readAt      DateTime?
  dismissedAt DateTime?
  resolvedAt  DateTime?

  // Relacje
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  orderId     String?
  order       Order?   @relation(fields: [orderId], references: [id])

  createdAt   DateTime @default(now())
}

enum AlertType {
  LOW_STOCK
  ORDER_DELAYED
  DELIVERY_ISSUE
  QUALITY_PROBLEM
  MACHINE_MAINTENANCE
}

enum AlertSeverity {
  INFO
  WARNING
  CRITICAL
}
```

### Photo Documentation - Struktura

```prisma
model OrderPhoto {
  id          String   @id @default(cuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id])

  stage       ProductionStage
  filename    String
  path        String
  mimeType    String
  size        Int

  takenBy     String?
  takenAt     DateTime @default(now())

  // OCR
  detectedOrderNumber String?
  ocrConfidence       Float?

  createdAt   DateTime @default(now())
}

enum ProductionStage {
  MATERIAL_RECEIVED
  CUTTING
  ASSEMBLY
  GLAZING
  FINISHED
  LOADING
  DELIVERED
}
```

---

## Następne kroki

1. **Wybierz** 1-2 funkcjonalności do implementacji
2. **Przedyskutuj** szczegóły z użytkownikami
3. **Stwórz** szczegółowy plan implementacji
4. **Zacznij** od MVP (Minimum Viable Product)

---

> **Pytanie:** Która z tych funkcjonalności najbardziej Cię interesuje? Mogę rozwinąć dowolną z nich w szczegółowy plan implementacji.