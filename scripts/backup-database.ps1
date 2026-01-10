# ═══════════════════════════════════════════════════════════════
# AKROBUD - Automatyczne Backupy Bazy Danych SQLite
# ═══════════════════════════════════════════════════════════════
#
# Ten skrypt tworzy kopie zapasowe bazy danych produkcyjnej
# i czyści stare backupy (starsze niż 30 dni)
#
# Użycie:
#   powershell -ExecutionPolicy Bypass -File .\scripts\backup-database.ps1
#
# Aby zaplanować automatyczne backupy:
#   1. Otwórz Task Scheduler (taskschd.msc)
#   2. Create Basic Task...
#   3. Trigger: Daily, 3:00 AM
#   4. Action: Start a program
#      - Program: powershell.exe
#      - Arguments: -ExecutionPolicy Bypass -File "C:\inetpub\akrobud\scripts\backup-database.ps1"
#
# ═══════════════════════════════════════════════════════════════

# ───────────────────────────────────────────────────────────────
# KONFIGURACJA
# ───────────────────────────────────────────────────────────────

# Ścieżka do projektu (dostosuj jeśli instalujesz w innym miejscu)
$ProjectRoot = "C:\inetpub\akrobud"

# Ścieżka do bazy danych produkcyjnej
$DbPath = Join-Path $ProjectRoot "apps\api\prisma\prod.db"

# Folder na backupy
$BackupDir = Join-Path $ProjectRoot "backups"

# Ile dni zachować backupy (starsze zostaną usunięte)
$RetentionDays = 30

# ───────────────────────────────────────────────────────────────
# FUNKCJE
# ───────────────────────────────────────────────────────────────

function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$Timestamp] $Message"
}

function Test-DatabaseExists {
    if (-not (Test-Path $DbPath)) {
        Write-Log "BŁĄD: Nie znaleziono bazy danych: $DbPath"
        exit 1
    }
}

function New-BackupDirectory {
    if (-not (Test-Path $BackupDir)) {
        Write-Log "Tworzę folder backupów: $BackupDir"
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
}

function New-DatabaseBackup {
    $Timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
    $BackupFileName = "prod.db.backup-$Timestamp"
    $BackupPath = Join-Path $BackupDir $BackupFileName

    try {
        Write-Log "Tworzę backup bazy danych..."
        Copy-Item -Path $DbPath -Destination $BackupPath -Force

        # Sprawdź rozmiar pliku
        $BackupSize = (Get-Item $BackupPath).Length / 1MB
        $BackupSizeFormatted = "{0:N2} MB" -f $BackupSize

        Write-Log "✓ Backup utworzony: $BackupFileName ($BackupSizeFormatted)"
        return $BackupPath
    }
    catch {
        Write-Log "BŁĄD: Nie udało się utworzyć backupu: $_"
        exit 1
    }
}

function Remove-OldBackups {
    Write-Log "Sprawdzam stare backupy (starsze niż $RetentionDays dni)..."

    $CutoffDate = (Get-Date).AddDays(-$RetentionDays)
    $OldBackups = Get-ChildItem -Path $BackupDir -Filter "prod.db.backup-*" |
        Where-Object { $_.LastWriteTime -lt $CutoffDate }

    if ($OldBackups.Count -eq 0) {
        Write-Log "Brak starych backupów do usunięcia."
        return
    }

    Write-Log "Usuwam $($OldBackups.Count) starych backupów..."

    foreach ($Backup in $OldBackups) {
        try {
            Remove-Item -Path $Backup.FullName -Force
            Write-Log "  ✓ Usunięto: $($Backup.Name)"
        }
        catch {
            Write-Log "  ✗ Błąd usuwania: $($Backup.Name) - $_"
        }
    }
}

function Get-BackupStatistics {
    $AllBackups = Get-ChildItem -Path $BackupDir -Filter "prod.db.backup-*"
    $TotalSize = ($AllBackups | Measure-Object -Property Length -Sum).Sum / 1MB
    $TotalSizeFormatted = "{0:N2} MB" -f $TotalSize

    Write-Log "────────────────────────────────────────"
    Write-Log "Statystyki backupów:"
    Write-Log "  Liczba backupów: $($AllBackups.Count)"
    Write-Log "  Całkowity rozmiar: $TotalSizeFormatted"
    Write-Log "  Najstarszy: $($AllBackups | Sort-Object LastWriteTime | Select-Object -First 1 | ForEach-Object { $_.LastWriteTime.ToString('yyyy-MM-dd HH:mm') })"
    Write-Log "  Najnowszy: $($AllBackups | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | ForEach-Object { $_.LastWriteTime.ToString('yyyy-MM-dd HH:mm') })"
    Write-Log "────────────────────────────────────────"
}

# ───────────────────────────────────────────────────────────────
# MAIN
# ───────────────────────────────────────────────────────────────

Write-Log "════════════════════════════════════════"
Write-Log "AKROBUD - Backup Bazy Danych"
Write-Log "════════════════════════════════════════"

# 1. Sprawdź czy baza istnieje
Test-DatabaseExists

# 2. Stwórz folder backupów jeśli nie istnieje
New-BackupDirectory

# 3. Utwórz backup
$BackupPath = New-DatabaseBackup

# 4. Usuń stare backupy
Remove-OldBackups

# 5. Wyświetl statystyki
Get-BackupStatistics

Write-Log "════════════════════════════════════════"
Write-Log "Backup zakończony pomyślnie!"
Write-Log "════════════════════════════════════════"

exit 0
