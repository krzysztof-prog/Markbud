# 🚀 Proces produkcyjny - Przewodnik

Przewodnik krok po kroku jak wygląda proces od rozwoju do produkcji.

---

## 📦 pnpm: Produkcyjne vs Dev Dependencies

### Kiedy używać `--save-dev` (devDependencies)?

```bash
pnpm add -D <package>
# ALBO
pnpm add --save-dev <package>
```

**Używasz gdy:**
- ✅ Narzędzie potrzebne **tylko** podczas developmentu
- ✅ Nie będzie używane w produkcji (runtime)

**Przykłady:**
```bash
pnpm add -D typescript        # Kompilator TS (prod ma już JS)
pnpm add -D @types/node       # Typy TypeScript
pnpm add -D vitest            # Testy (nie uruchamiasz testów w prod)
pnpm add -D eslint            # Linter (nie potrzebny w prod)
pnpm add -D prettier          # Formatter (nie potrzebny w prod)
pnpm add -D tailwindcss       # Build tool CSS
```

---

### Kiedy używać produkcyjnego (dependencies)?

```bash
pnpm add <package>
# Domyślnie trafia do dependencies
```

**Używasz gdy:**
- ✅ Biblioteka jest **wymagana** w produkcji (runtime)
- ✅ Kod używa tego pakietu podczas działania aplikacji

**Przykłady:**
```bash
pnpm add fastify              # Backend server (MUSI być w prod)
pnpm add react                # Frontend framework (MUSI być w prod)
pnpm add @prisma/client       # Database client (MUSI być w prod)
pnpm add zod                  # Walidacja (używana runtime)
pnpm add react-query          # Data fetching (używane runtime)
```

---

### 🎯 Praktyczne rozróżnienie:

| Pytanie | Odpowiedź | Typ |
|---------|-----------|-----|
| Czy kod używa tego w runtime? | TAK → | `dependencies` |
| Czy tylko do buildu/testów? | TAK → | `devDependencies` |
| Czy serwer potrzebuje tego w prod? | TAK → | `dependencies` |
| Czy to narzędzie deweloperskie? | TAK → | `devDependencies` |

---

## 🔄 Git: Commit vs Push

### Git Commit - "Zapisz punkt kontrolny"

```bash
git add .
git commit -m "feat: Dodano przycisk do usuwania dostawy"
```

**Commit to:**
- ✅ **Lokalne** zapisanie zmian (tylko na Twoim komputerze)
- ✅ Punkt kontrolny - możesz do niego wrócić
- ✅ Historia zmian (co, kiedy, dlaczego)

**Kiedy commitować?**
1. ✅ Po ukończeniu **jednej** logicznej zmiany
2. ✅ Gdy kod **kompiluje się** (pnpm build działa)
3. ✅ Gdy feature **działa** (przetestowałeś lokalnie)
4. ✅ Przed rozpoczęciem nowej funkcjonalności

**Przykład:**
```bash
# Dzień pracy:
git commit -m "feat: Dodano soft delete do deliveries"     # 10:00
git commit -m "test: Testy dla soft delete"                # 11:30
git commit -m "fix: Poprawiono walidację formularza"       # 14:00
git commit -m "docs: Zaktualizowano README"                # 16:00

# 4 commity - wszystko LOKALNIE na Twoim kompie
```

---

### Git Push - "Wyślij na serwer"

```bash
git push
# ALBO
git push origin main
```

**Push to:**
- ✅ Wysłanie commitów na **zdalny serwer** (GitHub)
- ✅ Synchronizacja z zespołem (inni widzą zmiany)
- ✅ Backup kodu (jest na GitHubie)

**Kiedy pushować?**
1. ✅ **Koniec dnia pracy** - backup
2. ✅ Po ukończeniu **całego feature**
3. ✅ Przed **przerwą w pracy** (komputer może się zepsuć)
4. ✅ Gdy chcesz żeby **inni zobaczyli** Twoje zmiany

**Przykład:**
```bash
# 16:30 - koniec dnia:
git push  # Wszystkie 4 commity z dzisiaj idą na GitHub
```

---

## 🏗️ Proces produkcyjny - KROK PO KROKU

### 1️⃣ Development (Twój komputer)

```bash
# Tworzysz kod lokalnie
pnpm dev                    # Uruchamiasz app

# Testujesz
pnpm test                   # Uruchamiasz testy

# Budujesz
pnpm build                  # ✅ Musi działać!
```

**Checklist przed commitem:**
- [ ] Kod kompiluje się (`pnpm build`)
- [ ] Testy przechodzą (`pnpm test`)
- [ ] Nie ma błędów TypeScript
- [ ] Sprawdziłeś COMMON_MISTAKES.md

---

### 2️⃣ Commit (Lokalnie)

```bash
git add .
git commit -m "feat: Dodano panel kierownika"

# Zmiany zapisane LOKALNIE
```

---

### 3️⃣ Push (GitHub)

```bash
git push

# Zmiany wysłane na GitHub
```

---

### 4️⃣ Build produkcyjny (Serwer)

**Na serwerze produkcyjnym:**

```bash
# 1. Pobierz kod z GitHuba
git pull

# 2. Zainstaluj TYLKO produkcyjne dependencies
pnpm install --prod
# ALBO (jeśli trzeba zbudować projekt):
pnpm install  # Wszystkie deps (build needs devDeps)
pnpm build    # Zbuduj aplikację
pnpm install --prod  # Usuń devDeps (oszczędność miejsca)

# 3. Uruchom migracje bazy
pnpm db:migrate

# 4. Uruchom aplikację
pnpm start    # ALBO pm2/docker/systemd
```

---

## 📊 Diagram procesu

```
┌─────────────────────────────────────────────────┐
│ 1. DEVELOPMENT (Twój komputer)                 │
│                                                 │
│  pnpm dev  →  Kod  →  pnpm test  →  pnpm build │
│                         ✅              ✅       │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ 2. GIT COMMIT (Lokalnie)                        │
│                                                 │
│  git add .                                      │
│  git commit -m "feat: ..."                      │
│                                                 │
│  💾 Zapisane tylko na Twoim kompie              │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ 3. GIT PUSH (GitHub)                            │
│                                                 │
│  git push                                       │
│                                                 │
│  ☁️ Kod na GitHubie (backup)                    │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ 4. PRODUKCJA (Serwer)                           │
│                                                 │
│  git pull                                       │
│  pnpm install --prod                            │
│  pnpm db:migrate                                │
│  pnpm start                                     │
│                                                 │
│  🚀 Aplikacja działa dla użytkowników           │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Praktyczne przykłady

### Przykład 1: Nowy feature (dzień pracy)

```bash
# 9:00 - Zaczynasz pracę
git checkout main
git pull  # Pobierz najnowsze zmiany

# 9:15 - Instalujesz nową bibliotekę (prod dependency)
pnpm add react-hot-toast  # Notyfikacje (używane runtime)

# 10:00 - Piszesz kod
# ... kod ...

# 12:00 - Feature gotowy
pnpm build  # ✅ Działa
pnpm test   # ✅ Testy OK

# 12:15 - Commit
git add .
git commit -m "feat: Dodano toast notifications"

# 12:20 - Push
git push  # Backup na GitHub

# ☕ Lunch
```

---

### Przykład 2: Instalacja narzędzia deweloperskiego

```bash
# Chcesz dodać testy E2E z Playwright

# 1. Instalacja jako devDependency
pnpm add -D @playwright/test

# 2. Konfigurujesz
# ... playwright.config.ts ...

# 3. Piszesz testy
# ... testy ...

# 4. Commit
git add .
git commit -m "test: Dodano Playwright E2E tests"

# 5. Push
git push
```

---

### Przykład 3: Deploy na produkcję (serwer)

**Scenariusz:** Wrzucasz nowy feature na produkcję

```bash
# NA SERWERZE PRODUKCYJNYM:

# 1. Zatrzymaj aplikację
pm2 stop akrobud-api

# 2. Pobierz najnowszy kod
git pull

# 3. Sprawdź czy są nowe dependencies
pnpm install

# 4. Zbuduj aplikację
pnpm build

# 5. Usuń devDependencies (oszczędność miejsca)
pnpm install --prod

# 6. Uruchom migracje bazy (jeśli są)
pnpm db:migrate

# 7. Uruchom aplikację
pm2 start akrobud-api
pm2 save
```

---

## ⚠️ CZĘSTE BŁĘDY - Czego unikać

### ❌ BŁĄD 1: devDependency w produkcji

```bash
# ŹLE
pnpm add -D fastify  # Server NIE BĘDZIE DZIAŁAĆ w prod!

# DOBRZE
pnpm add fastify     # Trafia do dependencies
```

---

### ❌ BŁĄD 2: Push bez buildu

```bash
# ŹLE
git add .
git commit -m "feat: nowy feature"
git push
# A potem na produkcji: pnpm build → ERROR!

# DOBRZE
pnpm build  # ✅ Sprawdź PRZED commitem
git add .
git commit -m "feat: nowy feature"
git push
```

---

### ❌ BŁĄD 3: Commit bez testów

```bash
# ŹLE
git commit -m "feat: nowy feature"
# Ale testy nie działają!

# DOBRZE
pnpm test   # ✅ Sprawdź testy
pnpm build  # ✅ Sprawdź build
git commit -m "feat: nowy feature"
```

---

### ❌ BŁĄD 4: Brak pushu na koniec dnia

```bash
# ŹLE
# ... 5 commitów ...
# Wychodzisz z pracy BEZ git push
# Komputer się zepsuje → WSZYSTKO STRACONE

# DOBRZE
git push  # Backup na GitHub na koniec dnia!
```

---

## 📋 Checklist dla Ciebie

### Przed commitem:
- [ ] `pnpm build` działa ✅
- [ ] `pnpm test` działa ✅
- [ ] Nie ma błędów TypeScript
- [ ] Sprawdziłem COMMON_MISTAKES.md
- [ ] Dependencies są w odpowiedniej kategorii (prod/dev)

### Przed pushem:
- [ ] Wszystkie commity mają sensowne opisy
- [ ] Kod działa lokalnie
- [ ] Nie commitowałem plików wrażliwych (.env, hasła)

### Przed wdrożeniem na produkcję:
- [ ] Kod jest na GitHubie (git push)
- [ ] `pnpm build` działa
- [ ] Testy przechodzą
- [ ] Migracje bazy są gotowe
- [ ] Backup bazy produkcyjnej (na wszelki wypadek!)

---

## 🎓 Podsumowanie - Zasada 4 poziomów

| Poziom | Co | Kiedy | Komenda |
|--------|-----|-------|---------|
| **1. Praca** | Kodujesz lokalnie | Cały czas | `pnpm dev` |
| **2. Commit** | Zapisujesz punkt kontrolny | Po każdym feature | `git commit` |
| **3. Push** | Backup na GitHub | Koniec dnia / przed przerwą | `git push` |
| **4. Deploy** | Na produkcję | Gdy feature gotowy | `git pull + pnpm build` |

---

## 📚 Powiązane dokumenty

- [CLAUDE.md](../../CLAUDE.md) - Kontekst projektu
- [COMMON_MISTAKES.md](../../COMMON_MISTAKES.md) - Czego unikać
- [development-workflow.md](./development-workflow.md) - Workflow deweloperski
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Architektura projektu

---

**Ostatnia aktualizacja:** 2026-01-08
**Autor:** Krzysztof (z pomocą Claude Sonnet 4.5)
