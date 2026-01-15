# 🧪 Przewodnik testowania wersji produkcyjnej

**Data utworzenia:** 2026-01-13
**Dla kogo:** Użytkownicy testujący wersję produkcyjną
**Czas przeczytania:** 5 minut

---

## 📌 Przed rozpoczęciem testów

### ✅ Co mamy już przygotowane:

1. **Przycisk "🐛 Zgłoś problem"** - prawy dolny róg każdej strony
2. **System Health Dashboard** - dla administratorów
3. **Automatyczne backupy** - codziennie o 3:00
4. **Bezpieczne aktualizacje** - z automatycznym rollbackiem

### 🎯 Twoja rola jako testera:

- Używaj aplikacji normalnie (tak jak planujesz na co dzień)
- Zgłaszaj KAŻDY problem (nawet drobny)
- Sugeruj ulepszenia UX

---

## 🐛 Jak zgłosić problem?

### Krok 1: Kliknij przycisk "🐛 Zgłoś problem"

Znajdziesz go w **prawym dolnym rogu** każdej strony (poza stroną logowania).

### Krok 2: Opisz dokładnie co się stało

**Dobre zgłoszenie (PRZYKŁAD):**

```
Próbowałem usunąć dostawę, ale po kliknięciu "Usuń" aplikacja się zawiesza.
Musiałem odświeżyć stronę. Dostawa NIE została usunięta.
```

**Złe zgłoszenie:**

```
Coś nie działa
```

### Krok 3: Dodaj szczegóły

Pomóż nam naprawić błąd szybciej:

- **CO robiłeś zanim coś się zepsuło?** (np. "Kliknąłem 'Zapisz' przy edycji zlecenia")
- **CO się stało?** (np. "Aplikacja się zawiesza", "Widzę błąd", "Nie mogę kliknąć przycisku")
- **JAK CZĘSTO to się zdarza?** (np. "Za każdym razem", "Czasami", "Raz na 10 prób")

### Krok 4: Wyślij zgłoszenie

Kliknij **"Wyślij zgłoszenie"**. Dostaniesz potwierdzenie "Zgłoszenie wysłane. Dziękujemy!".

---

## 💡 Co jest ważne do zgłoszenia?

### 🔴 KRYTYCZNE (zgłoś NATYCHMIAST):

- Aplikacja się zawiesza / crashuje
- Nie możesz się zalogować
- Dane znikają (zlecenia, dostawy, magazyn)
- Kwoty są niepoprawne (za duże, za małe, błędne)
- Import nie działa (pliki nie są importowane)

### 🟡 WAŻNE (zgłoś gdy zauważysz):

- Przycisk nie działa (musisz kliknąć 2x)
- Coś ładuje się bardzo długo (>10 sekund)
- Dane się nie odświeżają (musisz ręcznie odświeżyć stronę F5)
- Komunikaty błędów są niejasne ("Wystąpił błąd" - ale jaki?)
- Formularz nie zapisuje się poprawnie

### 🟢 SUGESTIE (mile widziane):

- "Przycisk X powinien być tutaj, a nie tam"
- "Lepiej byłoby gdyby..."
- "Przydałoby się..."
- "Nie rozumiem co robi ten przycisk"

---

## 📊 Dla Administratorów - Health Dashboard

### Gdzie znajdę Health Dashboard?

1. Zaloguj się jako administrator
2. W sidebarze kliknij **"Admin"** → **"System Health"**

### Co widzę w Health Dashboard?

- **Status Ogólny** - czy wszystko działa? (Healthy / Degraded / Unhealthy)
- **Baza Danych** - czy połączenie z bazą działa?
- **Miejsce na dysku** - ile miejsca pozostało?
- **Foldery sieciowe** - czy dostęp do folderów importu działa?
- **Ostatnie importy** - które pliki zostały zaimportowane?
- **Uptime** - od jak dawna aplikacja działa?

### Kiedy sprawdzać Health Dashboard?

- **Rano** (przed rozpoczęciem pracy)
- **Po zgłoszeniu problemu** (sprawdź czy coś się zepsuło)
- **Gdy coś nie działa** (może to problem systemowy, a nie Twój)

---

## 🔄 Co się stanie z moim zgłoszeniem?

### 1. Zgłoszenie trafia do pliku `logs/bug-reports.log`

Administrator sprawdza zgłoszenia codziennie (rano i wieczorem).

### 2. Priorytetyzacja

- **Krytyczne** - naprawiamy ASAP (w ciągu kilku godzin)
- **Ważne** - naprawiamy w ciągu 1-2 dni
- **Sugestie** - rozważamy i planujemy na przyszłość

### 3. Fix + aktualizacja

Gdy błąd zostanie naprawiony:

- Dostaniesz informację "Naprawiliśmy X - sprawdź czy działa"
- Aplikacja zostanie zaktualizowana automatycznie (nocą lub w weekend)

### 4. Weryfikacja

Sprawdzisz czy błąd został naprawiony.

---

## 🚨 Co robić gdy coś się BARDZO psuje?

### Scenariusz 1: Aplikacja nie odpowiada / crashuje

1. **Odśwież stronę** (F5)
2. **Jeśli nie pomaga:** Zamknij przeglądarkę i otwórz ponownie
3. **Jeśli dalej nie działa:** Zadzwoń do administratora

### Scenariusz 2: Dane znikły / są niepoprawne

1. **NIE próbuj "naprawiać" samodzielnie** (możesz pogorszyć)
2. **Zgłoś problem** (przycisk "🐛 Zgłoś problem")
3. **Zadzwoń do administratora** (to priorytet P0)

### Scenariusz 3: Import nie działa

1. **Sprawdź czy plik jest w poprawnym folderze** (`\\192.168.1.6\Public\Markbud_import\*`)
2. **Sprawdź czy plik ma poprawne rozszerzenie** (.csv / .xlsx)
3. **Poczekaj 2 minuty** (import działa co 1-2 minuty)
4. **Jeśli dalej nie działa:** Zgłoś problem

---

## 📞 Kontakt do administratora

**Krzysztof**
**Telefon:** [TU WPISZ NUMER]
**Email:** [TU WPISZ EMAIL]

**Kiedy dzwonić?**

- Aplikacja nie działa (crashuje, nie odpowiada)
- Dane znikły / są niepoprawne
- Import nie działa (po 5+ minutach)
- Nie możesz się zalogować

**Kiedy wysłać zgłoszenie przez aplikację?**

- Wszystko inne (przyciski nie działają, coś się ładuje wolno, sugestie)

---

## ✅ Checklist dla testera

### Przed rozpoczęciem testów:

- [ ] Wiem gdzie jest przycisk "🐛 Zgłoś problem"
- [ ] Wiem jak opisać problem (CO robiłem, CO się stało)
- [ ] Mam numer telefonu do administratora (na wypadek krytycznego błędu)

### Podczas testów:

- [ ] Zgłaszam KAŻDY problem (nawet drobny)
- [ ] Opisuję dokładnie co się stało (nie "coś nie działa")
- [ ] Testuję różne funkcje (nie tylko te które znam)

### Po testach:

- [ ] Przekazuję feedback ("To działa dobrze", "To można poprawić")

---

## 💡 FAQ

### Czy mogę zepsuć coś testując?

**NIE.** Mamy automatyczne backupy + możliwość rollback. Testuj śmiało!

### Ile razy dziennie mogę zgłaszać problemy?

**Bez ograniczeń.** Im więcej zgłoszeń, tym lepiej.

### Co jeśli zgłoszę coś co "nie jest błędem"?

**Nie szkodzi.** Lepiej zgłosić za dużo niż za mało.

### Czy moje zgłoszenie jest anonimowe?

**NIE.** Widzimy kto zgłasza (email). Pomaga to w dopytaniu o szczegóły.

### Jak długo trwa naprawa błędu?

- **Krytyczne:** kilka godzin
- **Ważne:** 1-2 dni
- **Sugestie:** zależnie od priorytetów

---

## 📚 Więcej informacji

- [Dokumentacja użytkownika](../user-guides/) - jak używać aplikacji
- [Troubleshooting](../user-guides/troubleshooting.md) - częste problemy
- [CHANGELOG](../../CHANGELOG_USER.md) - co się zmieniło w ostatniej wersji

---

**Dziękujemy za pomoc w testach!** 🎉

Twoje zgłoszenia pomagają nam stworzyć lepszą aplikację dla wszystkich.
