# AKROBUD - Przykłady, Scenariusze i Wzorce dla Claude

> Ten plik zawiera **szczegółowe przykłady** i **scenariusze** przeniesione z CLAUDE.md.
> Główne zasady znajdziesz w [CLAUDE.md](CLAUDE.md).

---

## ⛔ HARD STOP RULE - Przykład

```
User: "Dodaj przycisk do usuwania dostawy"

❌ ŹLE: *od razu pisze kod*

✅ DOBRZE:
"Zanim zacznę, mam pytania:

1. Co ma się stać z zleceniami przypisanymi do dostawy?
   - Opcja A: Pozostają nieprzypisane
   - Opcja B: Usuwają się razem z dostawą

2. Soft delete (możliwość przywrócenia) czy Hard delete?
   - Opcja A: Soft delete (deletedAt)
   - Opcja B: Hard delete (NIEODWRACALNE)

3. Czy wymagane potwierdzenie przed usunięciem?

Którą opcję wybierasz dla każdego punktu?"
```

---

## ✅ Definition of Done - Szczegółowe Przykłady

### 1. Wypisze co zmienił:
```
Zmiany:
- Dodano soft delete do deliveries
- Dodano confirmation dialog
- Zaktualizowano handler deleteDelivery
```

### 2. Wskaże pliki:
```
Zmienione pliki:
- apps/api/src/handlers/deliveryHandler.ts (linia 123-145)
- apps/api/src/services/deliveryService.ts (linia 67-89)
- apps/web/src/features/deliveries/DeleteDeliveryDialog.tsx (nowy plik)
```

### 3. Sprawdzi zgodność z COMMON_MISTAKES.md:
```
Checklist:
✅ Soft delete zamiast hard delete
✅ Confirmation dialog
✅ Disabled button podczas mutacji
✅ Money.ts użyty (jeśli dotyczy)
```

### 4. Zaproponuje testy manualne:
```
Jak przetestować:
1. Otwórz listę dostaw
2. Kliknij "Usuń" przy dostawie z zleceniami
3. Sprawdź czy pojawia się dialog z potwierdzeniem
4. Kliknij "Anuluj" - dostawa NIE powinna zniknąć
5. Kliknij "Usuń" ponownie → "Potwierdź" - dostawa oznaczona jako usunięta
6. Sprawdź w bazie czy deletedAt jest ustawione (nie hard delete)
```

### 5. Zapyta:
```
Czy:
- Robimy merge do głównej gałęzi?
- Przechodzimy do kolejnego zadania?
- Chcesz jeszcze coś zmienić?
```

---

## 🔄 SESSION STATE SNAPSHOT - Pełny Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📸 SESSION STATE SNAPSHOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 AKTUALNE ZADANIE:
[1 zdanie - CO ROBIMY]

📊 KONTEKST:
Moduł: [np. Deliveries, Orders, Warehouse]
Cel biznesowy: [krótko - PO CO]

✅ DECYZJE PODJĘTE:
- [x] Opcja A wybrana: [krótki opis]
- [ ] Opcja B odrzucona

📁 ZMIENIONE PLIKI:
- apps/api/src/handlers/XXX.ts (linie 123-145)
- apps/web/src/features/YYY/ZZZ.tsx (nowy plik)

✅ OSTATNI UKOŃCZONY KROK:
[Co właśnie zostało zrobione]

➡️ NASTĘPNY KROK:
[Co ma być zrobione dalej]

🔍 DOD CHECKLIST:
- [x] money.ts użyty (jeśli kwoty)
- [x] Soft delete (jeśli usuwanie)
- [ ] Testy manualne zaproponowane
- [ ] Użytkownik zapytany o merge/dalej

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 INSTRUKCJA WZNAWIANIA SESJI:
Skopiuj zawartość tego snapshotu do SESSION_STATE.md
lub użyj w nowej sesji jako prompt:
"Wznawiamy pracę. [WKLEJ SNAPSHOT]. Potwierdź i zaproponuj następny krok."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Wznawianie sesji:

**Gdy sesja padnie, w nowej sesji użytkownik wkleja:**
```
Wznawiamy pracę.

To jest aktualny SESSION STATE:
[SNAPSHOT Z POPRZEDNIEJ SESJI]

Przeczytaj, potwierdź zrozumienie i zaproponuj następny krok.
```

**Claude odpowiada:**
1. ✅ Potwierdza zrozumienie kontekstu
2. ✅ Podsumowuje stan (co jest zrobione, co zostało)
3. ✅ Proponuje konkretny następny krok
4. ✅ Pyta o zgodę na kontynuację

---

## 🚫 Anti-Hallucination Rules - Przykłady

### 1. Zakładanie istnienia plików
```
❌ ŹLE:
"Użyję istniejącego pliku `apps/web/src/utils/validators.ts`"
(nie sprawdziłem czy istnieje)

✅ DOBRZE:
"Potrzebuję walidatora. Sprawdzam czy istnieje `utils/validators.ts`..."
*używa Glob/Read*
"Nie znalazłem. Mogę:
 A) Stworzyć nowy plik utils/validators.ts
 B) Dodać do istniejącego pliku
Którą opcję wybierasz?"
```

### 2. Używanie API których nie widzi w repo
```
❌ ŹLE:
"Użyję funkcji `getOrders()` z API"
(nie sprawdziłem czy istnieje)

✅ DOBRZE:
"Sprawdzam czy `getOrders()` istnieje w API..."
*używa Grep*
"Znalazłem w `apps/api/src/services/orderService.ts:45`"
```

### 3. Zmiana architektury bez pytania
```
❌ ŹLE:
"Przeniósł bym services/ do features/"
(użytkownik nie poprosił o refactoring)

✅ DOBRZE:
"Zauważyłem że można poprawić strukturę. Chcesz żebym:
 A) Zostawił jak jest (tylko fix bug)
 B) Zrefaktorował strukturę (2h pracy)
Co wybierasz?"
```

### Jeżeli czegoś NIE MA:
1. **→ Zapytaj użytkownika:** "Nie znalazłem pliku X. Czy mam go stworzyć?"
2. **→ Albo zaproponuj jawnie jako nowy plik:** "Stworzę nowy plik `apps/api/src/utils/date-helpers.ts` z funkcją formatDate(). Czy OK?"
3. **→ NIGDY nie zakładaj że "pewnie gdzieś jest"**

---

## 🔴 Krytyczne zasady - Przykłady kodu

### 1. Operacje na pieniądzach bez money.ts
```typescript
// ❌ BŁĄD - wyświetli x100 za dużo
const total = parseFloat(order.valuePln);

// ✅ ZAWSZE
import { groszeToPln } from './utils/money';
const total = groszeToPln(order.valuePln as Grosze);
```

### 2. Hard delete bez confirmation
```typescript
// ❌ NIGDY
await prisma.delivery.delete({ where: { id } });

// ✅ ZAWSZE
// 1. Pokaż dialog: "Czy na pewno? Nieodwracalne!"
// 2. Soft delete:
await prisma.delivery.update({
  where: { id },
  data: { deletedAt: new Date() }
});
```

### 3. Buttony bez disabled podczas mutacji
```typescript
const { mutate, isPending } = useMutation(...);
<Button disabled={isPending}>
  {isPending ? 'Ładowanie...' : 'Zapisz'}
</Button>
```

### 4. Import bez raportowania błędów
- Zbieraj errors[] + pokaż użytkownikowi ile się udało/nie udało

---

## 🪝 Safety Hooks - Przykład przepływu

```
User: "Dodaj przycisk do usuwania dostawy"

1. UserPromptSubmit:
   💡 INTENT → SCOPE → ACTION REMINDER
   "Rozważ dodanie: Po co? Co konkretnie? Jak?"

2. Claude (dzięki reminderowi):
   "Mam pytania zanim zacznę:
    1. Co ma się stać z zleceniami przypisanymi do dostawy?
       - Opcja A: Pozostają nieprzypisane
       - Opcja B: Usuwają się razem

    2. Soft delete czy Hard delete?

    Którą opcję wybierasz?"

3. User odpowiada: "Opcja A + Soft delete"

4. Claude pisze kod → handlers/deliveryHandler.ts

5. PreToolUse (przed Write):
   ✅ no-code-before-decision-guard.ts sprawdza:
      "Czy było pytanie? TAK ✓"
      "Czy było potwierdzenie? TAK ✓"
      → Pozwala zapisać

6. PostToolUse (po Write):
   🔍 SELF-REVIEW GATE
   "Sprawdź przed przejściem dalej:
    ✓ INTENT - odpowiada na zadanie?
    ✓ YAGNI - nie za-engineerowałem?
    ✓ COMMON_MISTAKES - soft delete? disabled button?
    ✓ ARCHITECTURE - Route → Handler → Service?
    ✓ RIPPLE EFFECTS - coś się zepsuje?"
```

---

## 🎬 Typowe Scenariusze - Jak Claude Powinien Działać

### Scenariusz 1: Nowy Feature
```
User: "Dodaj przycisk do usuwania dostawy"

Claude:
1. ✅ Pyta: "Co ma się stać z zleceniami przypisanymi do dostawy?"
2. ✅ Pokazuje opcje:
   "Opcja A: Soft delete (dostawa oznaczona jako usunięta)
    Opcja B: Hard delete (dostawa znika NA ZAWSZE)"
3. ✅ Pyta: "Czy wymagane potwierdzenie przed usunięciem?"
4. ✅ Aktywuje skill: backend-dev-guidelines
5. ✅ Koduje zgodnie ze standardami:
   - Confirmation dialog
   - Soft delete (deletedAt)
   - Disabled button podczas mutacji
6. ✅ Dodaje do LESSONS_LEARNED jeśli był błąd

❌ NIE: Od razu pisze kod bez pytań
```

### Scenariusz 2: Bug Fix
```
User: "Dashboard pokazuje złe kwoty"

Claude:
1. ✅ Pyta: "Jakie kwoty są złe? O ile się różnią?"
2. ✅ Sprawdza COMMON_MISTAKES.md → Money operations
3. ✅ Grepa codebase: `parseFloat.*valuePln`
4. ✅ Fix: Używa groszeToPln() z money.ts
5. ✅ Dodaje test aby zapobiec regresji
6. ✅ Aktualizuje LESSONS_LEARNED.md

❌ NIE: Zgaduje co jest źle bez sprawdzenia
```

### Scenariusz 3: Refactoring
```
User: "Ten komponent jest za duży, podziel go"

Claude:
1. ✅ Pyta: "Jak chcesz to podzielić? Według funkcjonalności czy według UI?"
2. ✅ Pokazuje opcje:
   "Opcja A (szybka): Wydzielam 2 subkomponenty
    Opcja B (lepsza): Reorganizuję do features/"
3. ✅ Aktywuje skill: frontend-dev-guidelines
4. ✅ Koduje zgodnie ze standardami:
   - Lazy loading ciężkich części
   - Suspense boundaries
   - Proper file organization

❌ NIE: Od razu dzieli jak mu się wydaje
```

### Scenariusz 4: Import Fix
```
User: "Import pomija niektóre wiersze"

Claude:
1. ✅ Sprawdza COMMON_MISTAKES.md → Import section
2. ✅ Pyta: "Czy użytkownik ma wiedzieć które wiersze zostały pominięte?"
3. ✅ Pokazuje opcje:
   "Opcja A: Toast z liczbą pominiętych
    Opcja B: Dialog + CSV do pobrania z błędami"
4. ✅ Koduje zgodnie ze standardami:
   - Zbiera errors[]
   - Raportuje success/failed/total
   - Możliwość pobrania raportu błędów

❌ NIE: Tylko loguje do console
```

---

## 💡 Przykłady Dobrych Pytań - Które Claude POWINIEN Zadać

### O biznes i UX:
- "Co użytkownik ma zobaczyć po kliknięciu tego przycisku?"
- "Czy ten formularz ma mieć walidację? Jakie pola są wymagane?"
- "Co się stanie jeśli użytkownik spróbuje usunąć dostawę z przypisanymi zleceniami?"
- "Czy wymagane jest potwierdzenie przed usunięciem?"
- "Jaki komunikat ma zobaczyć użytkownik gdy operacja się powiedzie?"
- "Co ma się stać gdy operacja się nie powiedzie?"

### O dane i strukturę:
- "Czy to pole może być null/undefined?"
- "Jakie są możliwe statusy? Czy mogą się zmieniać w dowolnej kolejności?"
- "Co ma się stać ze zleceniami gdy usuniesz dostawę?"
- "Czy wartość może być ujemna lub zero?"
- "Czy ta relacja to 1:1, 1:N czy N:N?"

### O konsekwencje i opcje:
- "Ta zmiana wpłynie na X, Y, Z. Czy to jest OK?"
- "Mogę to zrobić na 2 sposoby: [Opcja A] vs [Opcja B]. Który wybierasz?"
- "Ta operacja jest nieodwracalna. Czy na pewno tego chcesz?"
- "To będzie wymagało zmiany w 5 plikach. Czy mam kontynuować?"

---

## 🎯 Zasady komunikacji - Szczegóły

📖 **Pełna wersja:** [docs/CLAUDE_COMMUNICATION.md](docs/CLAUDE_COMMUNICATION.md)

### Pokazuj opcje (nie od razu koduj):
```
"Mam 2 opcje:

Opcja A (szybka, 15 min):
- [konkretny opis co zrobię]
- [jakie będą konsekwencje]

Opcja B (lepsza, 1h):
- [konkretny opis co zrobię]
- [jakie będą konsekwencje]

Którą wybierasz?"
```

**Przykład dobrej komunikacji:** Zobacz [docs/CLAUDE_COMMUNICATION.md](docs/CLAUDE_COMMUNICATION.md#przykład-dobrej-komunikacji)

---

## 🚀 DEPLOYMENT - Szczegółowe Przykłady

### NIE MIESZAJ FOLDERÓW DEV I PROD!

```powershell
# ❌ BŁĄD - Foldery lokalne w PROD
WATCH_FOLDER_UZYTE_BELE=C:/DEV_DATA/uzyte_bele

# ✅ DEV używa lokalnych folderów testowych:
WATCH_FOLDER_UZYTE_BELE=C:/DEV_DATA/uzyte_bele
WATCH_FOLDER_CENY=C:/DEV_DATA/ceny
# ... (wszystkie lokalne dla testów)

# ✅ PROD używa folderów sieciowych:
WATCH_FOLDER_UZYTE_BELE=//192.168.1.6/Public/Markbud_import/uzyte_bele
WATCH_FOLDER_CENY=//192.168.1.6/Public/Markbud_import/ceny
# ... (wszystkie sieciowe, prawdziwe dane)
```

### Różne porty dla DEV i PROD

```
DEV:  http://localhost:4000 (API) + http://localhost:3000 (Web)
PROD: http://192.168.1.XXX:5000 (API) + http://192.168.1.XXX:5001 (Web)
```

### Pliki konfiguracyjne

#### DEV (.env - lokalny, NIE w Git)
```powershell
# 1. Skopiuj template:
cd apps/api
copy .env.example .env

# 2. Edytuj .env i dodaj swoje credentials (Schuco itp.)
# 3. Ustaw lokalne foldery testowe (C:\DEV_DATA\*)
# 4. Port 3001 dla API

# ⚠️ NIGDY NIE COMMITUJ .env do Git!
```

#### PROD (.env.production - template w Git)
```powershell
# 1. NA SERWERZE PRODUKCYJNYM:
cd C:\inetpub\akrobud\apps\api

# 2. Skopiuj .env.production jako .env:
copy .env.production .env

# 3. Edytuj .env i ustaw:
#    - JWT_SECRET (losowy ciąg min. 32 znaki)
#    - CORS_ORIGIN (IP serwera:5001)
#    - Sprawdź czy foldery sieciowe są poprawne

# 4. Port 5000 dla API

# ⚠️ NIE EDYTUJ .env.production - to jest template!
```

### Gdy Claude widzi błąd konfiguracji:
```env
PORT=3001
WATCH_FOLDER_UZYTE_BELE=//192.168.1.6/...
```

**Claude MUSI:**
- 🛑 ZATRZYMAĆ SIĘ
- ❓ ZAPYTAĆ: "To jest błąd! DEV używa portów 3001/3000 + lokalnych folderów (C:\DEV_DATA\*). PROD używa portów 5000/5001 + folderów sieciowych. Którą konfigurację chcesz?"

---

**Wersja:** 1.0
**Utworzono:** 2026-02-24
**Źródło:** Przeniesiono z CLAUDE.md v3.1
