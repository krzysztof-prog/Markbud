# ═══════════════════════════════════════════════════════════════
# AKROBUD - Safe Update Script
# ═══════════════════════════════════════════════════════════════
#
# Bezpieczna aktualizacja produkcji z automatycznym rollback
#
# Użycie:
#   powershell -ExecutionPolicy Bypass -File .\scripts\safe-update.ps1
#
# Opcje:
#   -SkipBackup    Pomiń backup bazy (NIE POLECANE!)
#   -SkipTests     Pomiń testy po aktualizacji
#
# Przykład:
#   powershell -ExecutionPolicy Bypass -File .\scripts\safe-update.ps1 -SkipBackup
#
# ═══════════════════════════════════════════════════════════════

param(
    [switch]$SkipBackup = $false,
    [switch]$SkipTests = $false
)

$ErrorActionPreference = "Stop"

# ───────────────────────────────────────────────────────────────
# KONFIGURACJA
# ───────────────────────────────────────────────────────────────

$AppDir = "C:\markbud"
$DbPath = Join-Path $AppDir "apps\api\prisma\prod.db"
$BackupScript = Join-Path $AppDir "scripts\backup-database.ps1"

# ───────────────────────────────────────────────────────────────
# FUNKCJE
# ───────────────────────────────────────────────────────────────

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")

    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Color = switch ($Level) {
        "INFO" { "White" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR" { "Red" }
        default { "White" }
    }

    Write-Host "[$Timestamp] [$Level] $Message" -ForegroundColor $Color
}

function Test-PrerequisitesMet {
    Write-Log "Sprawdzanie wymagań wstępnych..."

    # Sprawdź czy folder aplikacji istnieje
    if (-not (Test-Path $AppDir)) {
        Write-Log "BŁĄD: Folder aplikacji nie istnieje: $AppDir" "ERROR"
        return $false
    }

    # Sprawdź czy PM2 jest zainstalowany
    try {
        $pm2Version = pm2 --version 2>&1
        Write-Log "PM2 zainstalowany: $pm2Version" "SUCCESS"
    }
    catch {
        Write-Log "BŁĄD: PM2 nie jest zainstalowany. Zainstaluj: npm install -g pm2" "ERROR"
        return $false
    }

    # Sprawdź czy pnpm jest zainstalowany
    try {
        $pnpmVersion = pnpm --version 2>&1
        Write-Log "pnpm zainstalowany: $pnpmVersion" "SUCCESS"
    }
    catch {
        Write-Log "BŁĄD: pnpm nie jest zainstalowany. Zainstaluj: npm install -g pnpm" "ERROR"
        return $false
    }

    # Sprawdź czy Git jest zainstalowany
    try {
        $gitVersion = git --version 2>&1
        Write-Log "Git zainstalowany: $gitVersion" "SUCCESS"
    }
    catch {
        Write-Log "BŁĄD: Git nie jest zainstalowany." "ERROR"
        return $false
    }

    return $true
}

function Invoke-Backup {
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Log "KROK 1/8: Backup bazy danych" "INFO"
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if ($SkipBackup) {
        Write-Log "UWAGA: Backup pominięty (flaga -SkipBackup)" "WARNING"
        return $true
    }

    try {
        & powershell -ExecutionPolicy Bypass -File $BackupScript
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Backup zakończony pomyślnie" "SUCCESS"
            return $true
        }
        else {
            Write-Log "Backup nie powiódł się" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "BŁĄD podczas backupu: $_" "ERROR"
        return $false
    }
}

function Test-HealthBefore {
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Log "KROK 2/8: Health check PRZED aktualizacją" "INFO"
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 5

        if ($response.StatusCode -eq 200) {
            Write-Log "Aplikacja działa prawidłowo" "SUCCESS"
            return $true
        }
        else {
            Write-Log "Aplikacja nie odpowiada poprawnie (Status: $($response.StatusCode))" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "BŁĄD: Aplikacja nie odpowiada: $_" "ERROR"
        return $false
    }
}

function Stop-Application {
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Log "KROK 3/8: Zatrzymanie aplikacji" "INFO"
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    try {
        pm2 stop all
        Write-Log "Aplikacja zatrzymana" "SUCCESS"
        return $true
    }
    catch {
        Write-Log "BŁĄD podczas zatrzymywania aplikacji: $_" "ERROR"
        return $false
    }
}

function Get-UpdateChanges {
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Log "KROK 4/8: Pobieranie nowej wersji" "INFO"
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    Set-Location $AppDir

    # Zapisz obecny commit
    $gitBefore = git rev-parse HEAD
    Write-Log "Obecny commit: $gitBefore"

    # Pobierz nową wersję
    try {
        git pull origin main

        if ($LASTEXITCODE -ne 0) {
            Write-Log "BŁĄD: git pull nie powiódł się" "ERROR"
            return @{ Success = $false }
        }
    }
    catch {
        Write-Log "BŁĄD podczas git pull: $_" "ERROR"
        return @{ Success = $false }
    }

    # Sprawdź nowy commit
    $gitAfter = git rev-parse HEAD

    if ($gitBefore -eq $gitAfter) {
        Write-Log "Brak nowych zmian. Aplikacja jest aktualna." "INFO"
        return @{ Success = $true; NoChanges = $true }
    }

    Write-Log "Nowy commit: $gitAfter" "SUCCESS"

    # Sprawdź czy są zmiany w schema.prisma
    $schemaDiff = git diff $gitBefore $gitAfter -- apps/api/prisma/schema.prisma
    $hasSchemaMigration = $schemaDiff.Length -gt 0

    if ($hasSchemaMigration) {
        Write-Log "Wykryto zmiany w schema.prisma - wymagana migracja bazy" "WARNING"
    }

    return @{
        Success = $true
        NoChanges = $false
        GitBefore = $gitBefore
        GitAfter = $gitAfter
        HasSchemaMigration = $hasSchemaMigration
    }
}

function Install-Dependencies {
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Log "KROK 5/8: Instalacja zależności" "INFO"
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    try {
        Set-Location $AppDir
        pnpm install --frozen-lockfile

        if ($LASTEXITCODE -ne 0) {
            Write-Log "BŁĄD: pnpm install nie powiodło się" "ERROR"
            return $false
        }

        Write-Log "Zależności zainstalowane" "SUCCESS"
        return $true
    }
    catch {
        Write-Log "BŁĄD podczas instalacji zależności: $_" "ERROR"
        return $false
    }
}

function Build-Application {
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Log "KROK 6/8: Build aplikacji" "INFO"
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    try {
        Set-Location $AppDir
        pnpm build

        if ($LASTEXITCODE -ne 0) {
            Write-Log "BŁĄD: pnpm build nie powiodło się" "ERROR"
            return $false
        }

        Write-Log "Build zakończony pomyślnie" "SUCCESS"
        return $true
    }
    catch {
        Write-Log "BŁĄD podczas buildu: $_" "ERROR"
        return $false
    }
}

function Invoke-DatabaseMigration {
    param([bool]$HasSchemaMigration)

    if (-not $HasSchemaMigration) {
        Write-Log "Brak zmian w schema.prisma - pomijam migrację"
        return $true
    }

    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Log "KROK 6a/8: Migracja bazy danych" "INFO"
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    try {
        Set-Location (Join-Path $AppDir "apps\api")

        pnpm prisma migrate deploy
        if ($LASTEXITCODE -ne 0) {
            Write-Log "BŁĄD: Migracja nie powiodła się" "ERROR"
            return $false
        }

        pnpm prisma generate
        if ($LASTEXITCODE -ne 0) {
            Write-Log "BŁĄD: Prisma generate nie powiodło się" "ERROR"
            return $false
        }

        Write-Log "Migracja zakończona pomyślnie" "SUCCESS"
        return $true
    }
    catch {
        Write-Log "BŁĄD podczas migracji: $_" "ERROR"
        return $false
    }
}

function Start-Application {
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Log "KROK 7/8: Restart aplikacji" "INFO"
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    try {
        Set-Location $AppDir
        pm2 restart all

        Write-Log "Aplikacja uruchomiona" "SUCCESS"
        Write-Log "Czekam 10 sekund na start..."
        Start-Sleep -Seconds 10

        return $true
    }
    catch {
        Write-Log "BŁĄD podczas restartowania aplikacji: $_" "ERROR"
        return $false
    }
}

function Test-HealthAfter {
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Log "KROK 8/8: Health check PO aktualizacji" "INFO"
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 10

        if ($response.StatusCode -eq 200) {
            Write-Log "Aplikacja działa prawidłowo" "SUCCESS"
            return $true
        }
        else {
            Write-Log "Aplikacja nie odpowiada poprawnie (Status: $($response.StatusCode))" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "BŁĄD: Aplikacja nie odpowiada: $_" "ERROR"
        return $false
    }
}

function Invoke-Rollback {
    param([string]$GitBefore)

    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Log "ROLLBACK - Wracam do poprzedniej wersji" "WARNING"
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    Set-Location $AppDir

    try {
        # Wróć do poprzedniego commita
        git reset --hard $GitBefore
        Write-Log "Kod przywrócony do: $GitBefore"

        # Reinstall dependencies
        pnpm install --frozen-lockfile

        # Rebuild
        pnpm build

        # Restart
        pm2 restart all

        Write-Log "Rollback zakończony. Aplikacja powinna działać." "SUCCESS"
    }
    catch {
        Write-Log "BŁĄD podczas rollbacku: $_" "ERROR"
        Write-Log "UWAGA: Aplikacja może być w niestabilnym stanie!" "ERROR"
    }
}

# ───────────────────────────────────────────────────────────────
# MAIN SCRIPT
# ───────────────────────────────────────────────────────────────

Write-Log "════════════════════════════════════════" "INFO"
Write-Log "AKROBUD - Safe Update Script" "INFO"
Write-Log "════════════════════════════════════════" "INFO"
Write-Host ""

# Sprawdź wymagania
if (-not (Test-PrerequisitesMet)) {
    Write-Log "Wymagania nie są spełnione. ABORT." "ERROR"
    exit 1
}

# KROK 1: Backup
if (-not (Invoke-Backup)) {
    Write-Log "Backup nie powiódł się. ABORT." "ERROR"
    exit 1
}

# KROK 2: Health check przed
if (-not (Test-HealthBefore)) {
    Write-Log "Aplikacja nie działa przed aktualizacją. ABORT." "ERROR"
    exit 1
}

# KROK 3: Zatrzymaj aplikację
if (-not (Stop-Application)) {
    Write-Log "Nie można zatrzymać aplikacji. ABORT." "ERROR"
    exit 1
}

# KROK 4: Pobierz zmiany
$updateResult = Get-UpdateChanges
if (-not $updateResult.Success) {
    Write-Log "Nie można pobrać zmian. ABORT." "ERROR"
    pm2 restart all
    exit 1
}

if ($updateResult.NoChanges) {
    Write-Log "Brak zmian. Restartuj aplikację..." "INFO"
    pm2 restart all
    Write-Log "Zakończono." "SUCCESS"
    exit 0
}

# KROK 5: Zainstaluj zależności
if (-not (Install-Dependencies)) {
    Write-Log "Instalacja zależności nie powiodła się. ROLLBACK..." "ERROR"
    Invoke-Rollback -GitBefore $updateResult.GitBefore
    exit 1
}

# KROK 6: Build
if (-not (Build-Application)) {
    Write-Log "Build nie powiódł się. ROLLBACK..." "ERROR"
    Invoke-Rollback -GitBefore $updateResult.GitBefore
    exit 1
}

# KROK 6a: Migracja (jeśli potrzeba)
if (-not (Invoke-DatabaseMigration -HasSchemaMigration $updateResult.HasSchemaMigration)) {
    Write-Log "Migracja nie powiodła się. ROLLBACK..." "ERROR"
    Invoke-Rollback -GitBefore $updateResult.GitBefore
    exit 1
}

# KROK 7: Restart
if (-not (Start-Application)) {
    Write-Log "Restart nie powiódł się. ROLLBACK..." "ERROR"
    Invoke-Rollback -GitBefore $updateResult.GitBefore
    exit 1
}

# KROK 8: Health check po
if (-not (Test-HealthAfter)) {
    Write-Log "Aplikacja nie odpowiada po aktualizacji. ROLLBACK..." "ERROR"
    Invoke-Rollback -GitBefore $updateResult.GitBefore
    exit 1
}

# SUCCESS!
Write-Log "════════════════════════════════════════" "SUCCESS"
Write-Log "AKTUALIZACJA ZAKOŃCZONA POMYŚLNIE!" "SUCCESS"
Write-Log "════════════════════════════════════════" "SUCCESS"
Write-Host ""

# Pokaż status PM2
Write-Log "Status PM2:"
pm2 status

Write-Log ""
Write-Log "Aktualizacja z: $($updateResult.GitBefore)" "INFO"
Write-Log "         na: $($updateResult.GitAfter)" "INFO"

exit 0
