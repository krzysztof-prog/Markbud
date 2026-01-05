# Plan Wdrożenia Produkcyjnego AKROBUD

> **Status:** GOTOWY DO IMPLEMENTACJI
> **Data:** 7 grudnia 2025
> **Kontynuacja:** jutro

---

## PODSUMOWANIE USTALEŃ

| Pytanie | Odpowiedź |
|---------|-----------|
| System serwera | **Windows Server** |
| Repozytorium Git | **Masz** |
| Adres IP serwera | Do sprawdzenia |
| Dostęp przez internet | Możliwe (później) |
| Dane produkcyjne | **TAK - do migracji** |

---

## TWOJE DANE W BAZIE (do przeniesienia)

| Tabela | Ilość rekordów |
|--------|----------------|
| Zlecenia (orders) | 99 |
| Profile | 17 |
| Kolory | 18 |
| Dostawy | 12 |
| Stan magazynu | 252 |
| Schuco zamówienia | 1712 |
| Zapotrzebowania | 356 |

**Rozmiar bazy:** ~1.7MB (migracja zajmie kilka sekund)

---

## CO CHCEMY OSIĄGNĄĆ?

```
┌─────────────────────────────────────────────────────────────┐
│                    JAK TO BĘDZIE DZIAŁAĆ                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   TWÓJ KOMPUTER              SERWER WINDOWS                 │
│   ┌──────────┐               ┌────────────────────────┐     │
│   │ VS Code  │  git push     │  Docker Desktop        │     │
│   │ + Git    │ ───────────►  │  ┌──────┐ ┌──────────┐ │     │
│   └──────────┘               │  │ API  │ │PostgreSQL│ │     │
│                              │  │      │ │  (baza)  │ │     │
│   Robisz zmiany              │  └──────┘ └──────────┘ │     │
│   i wysyłasz                 │  ┌──────┐              │     │
│                              │  │ WEB  │              │     │
│                              │  └──────┘              │     │
│                              └────────────────────────┘     │
│                                        │                     │
│                              ┌─────────┴─────────┐          │
│                              │  Komputery w firmie │         │
│                              │  otwierają stronę   │         │
│                              │  http://192.168.x.x │         │
│                              └───────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## SŁOWNICZEK (dla 10-latka)

| Pojęcie | Co to znaczy? |
|---------|---------------|
| **Serwer** | Mocny komputer, który jest włączony cały czas i serwuje program innym |
| **PostgreSQL** | Baza danych - taki "Excel na sterydach", przechowuje wszystkie dane firmy |
| **Docker** | Pudełko, w którym pakujemy cały program ze wszystkim co potrzebuje |
| **Git** | System śledzenia zmian - jak "Zapisz wersję" w grze, ale lepszy |
| **Backup** | Kopia zapasowa - jak skopiowanie pliku na pendrive |
| **Migracja** | Przeprowadzka danych do nowego miejsca |

---

## KROKI DO WYKONANIA

### KROK 1: Przygotowanie Serwera Windows (2-4h)

**Co zainstalować:**
1. **Docker Desktop** - pobierz z https://docker.com/products/docker-desktop/
2. **Git** - pobierz z https://git-scm.com/download/win
3. **Node.js 20 LTS** - pobierz z https://nodejs.org/

**Po instalacji:**
```powershell
# Sprawdź czy działa
docker --version
git --version
node --version

# Zainstaluj pnpm
npm install -g pnpm
```

---

### KROK 2: Pliki do utworzenia

#### 2.1 Zmienić `apps/api/prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"  # <-- zmiana z "sqlite"
  url      = env("DATABASE_URL")
}
```

#### 2.2 Utworzyć `docker-compose.yml` (główny folder)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: akrobud-db
    restart: always
    environment:
      POSTGRES_USER: akrobud
      POSTGRES_PASSWORD: TwojeHaslo123!
      POSTGRES_DB: akrobud
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: akrobud-api
    restart: always
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://akrobud:TwojeHaslo123!@postgres:5432/akrobud
      NODE_ENV: production
      API_PORT: 3001
      API_HOST: 0.0.0.0
      JWT_SECRET: wygeneruj-dlugi-losowy-ciag-min-32-znaki
    ports:
      - "3001:3001"
    volumes:
      - ./uploads:/app/uploads
      - ./downloads:/app/downloads

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    container_name: akrobud-web
    restart: always
    depends_on:
      - api
    environment:
      NEXT_PUBLIC_API_URL: http://ADRES_IP_SERWERA:3001
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

#### 2.3 Utworzyć `apps/api/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile
COPY apps/api ./apps/api
RUN cd apps/api && pnpm db:generate
RUN cd apps/api && pnpm build
WORKDIR /app/apps/api
CMD ["node", "dist/index.js"]
```

#### 2.4 Utworzyć `apps/web/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile
COPY apps/web ./apps/web
RUN cd apps/web && pnpm build
WORKDIR /app/apps/web
CMD ["pnpm", "start"]
```

#### 2.5 Utworzyć `deploy.ps1` (skrypt aktualizacji)

```powershell
Write-Host "=== AKTUALIZACJA AKROBUD ===" -ForegroundColor Green

Set-Location C:\akrobud\Markbud

Write-Host "1. Pobieram nowe zmiany..." -ForegroundColor Yellow
git pull origin main

Write-Host "2. Zatrzymuję stare kontenery..." -ForegroundColor Yellow
docker compose down

Write-Host "3. Buduję nową wersję..." -ForegroundColor Yellow
docker compose build

Write-Host "4. Aktualizuję bazę danych..." -ForegroundColor Yellow
docker compose run --rm api pnpm db:migrate:deploy

Write-Host "5. Uruchamiam nową wersję..." -ForegroundColor Yellow
docker compose up -d

Write-Host "=== GOTOWE! ===" -ForegroundColor Green
Write-Host "Sprawdź: http://ADRES_IP_SERWERA:3000"
```

#### 2.6 Utworzyć `backup.ps1` (skrypt backupu)

```powershell
$BackupDir = "C:\akrobud\backups"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"

# Utwórz folder jeśli nie istnieje
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

# Backup bazy PostgreSQL
docker exec akrobud-db pg_dump -U akrobud akrobud | Out-File "$BackupDir\db_$Date.sql" -Encoding UTF8

# Kompresuj
Compress-Archive -Path "$BackupDir\db_$Date.sql" -DestinationPath "$BackupDir\db_$Date.zip"
Remove-Item "$BackupDir\db_$Date.sql"

# Usuń stare backupy (starsze niż 30 dni)
Get-ChildItem $BackupDir -Filter "*.zip" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item

Write-Host "Backup utworzony: db_$Date.zip" -ForegroundColor Green
```

---

### KROK 3: Jak robić aktualizację (po wdrożeniu)

```
NA TWOIM KOMPUTERZE:
1. Zrób zmiany w kodzie
2. Przetestuj lokalnie
3. git add .
4. git commit -m "Co zmieniłeś"
5. git push

NA SERWERZE:
1. Otwórz PowerShell
2. Wpisz: .\deploy.ps1
3. Poczekaj 2-5 minut
4. Gotowe!
```

---

### KROK 4: Co robić gdy coś się zepsuje

**Strona nie działa:**
```powershell
docker compose ps          # Sprawdź status
docker compose logs api    # Zobacz błędy API
docker compose logs web    # Zobacz błędy Web
docker compose down
docker compose up -d       # Restart
```

**Aktualizacja zepsuła program:**
```powershell
git log --oneline -5       # Zobacz ostatnie zmiany
git revert HEAD            # Cofnij ostatnią zmianę
.\deploy.ps1               # Wdróż cofniętą wersję
```

**Przywróć z backupu:**
```powershell
Expand-Archive C:\akrobud\backups\db_XXXXXXXX.zip -DestinationPath C:\akrobud\temp
Get-Content C:\akrobud\temp\db_XXXXXXXX.sql | docker exec -i akrobud-db psql -U akrobud akrobud
```

---

## LISTA KONTROLNA

- [ ] Serwer Windows Server przygotowany
- [ ] Docker Desktop zainstalowany
- [ ] Git zainstalowany
- [ ] Adres IP serwera ustalony
- [ ] Pliki Dockerfile utworzone
- [ ] docker-compose.yml utworzony
- [ ] Schema Prisma zmieniona na PostgreSQL
- [ ] Skrypt migracji danych utworzony
- [ ] Dane zmigrowane
- [ ] deploy.ps1 utworzony
- [ ] backup.ps1 utworzony
- [ ] Automatyczny backup skonfigurowany (Task Scheduler)
- [ ] Testy przeprowadzone
- [ ] Użytkownicy poinformowani

---

## SZACOWANY CZAS

| Etap | Czas |
|------|------|
| Przygotowanie serwera | 2-4h |
| Konfiguracja Docker | 2-3h |
| Migracja danych | 1-2h |
| Testy | 2-4h |
| **RAZEM** | **7-13h** |

---

## NASTĘPNE KROKI (jutro)

1. Sprawdź adres IP serwera
2. Powiedz "Robimy" - utworzę wszystkie pliki automatycznie
3. Zainstalujemy Docker na serwerze
4. Przeprowadzimy migrację
