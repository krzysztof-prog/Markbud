# Skrypt PowerShell do utworzenia folderów importów w nowej lokalizacji
# Uruchom jako Administrator jeśli C:\ wymaga uprawnień

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Tworzenie folderów importów AKROBUD" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Ścieżka bazowa
$basePath = "C:\MB"

# Lista folderów do utworzenia
$folders = @(
    "$basePath\uzyte_bele",
    "$basePath\uzyte_bele\_archiwum",
    "$basePath\ceny",
    "$basePath\ceny\_archiwum",
    "$basePath\zamowienia_szyb",
    "$basePath\zamowienia_szyb\_archiwum",
    "$basePath\dostawy_szyb",
    "$basePath\dostawy_szyb\_archiwum"
)

Write-Host "Foldery do utworzenia:" -ForegroundColor Yellow
foreach ($folder in $folders) {
    Write-Host "  - $folder"
}
Write-Host ""

# Utwórz foldery
$created = 0
$skipped = 0

foreach ($folder in $folders) {
    if (Test-Path -Path $folder) {
        Write-Host "[ISTNIEJE] $folder" -ForegroundColor Gray
        $skipped++
    } else {
        try {
            New-Item -Path $folder -ItemType Directory -Force | Out-Null
            Write-Host "[UTWORZONO] $folder" -ForegroundColor Green
            $created++
        } catch {
            Write-Host "[BŁĄD] Nie można utworzyć $folder : $_" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Podsumowanie:" -ForegroundColor Cyan
Write-Host "  Utworzonych: $created" -ForegroundColor Green
Write-Host "  Pominiętych (już istniały): $skipped" -ForegroundColor Gray
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Gotowe! Foldery są gotowe do użycia." -ForegroundColor Green
Write-Host ""
Write-Host "Następne kroki:" -ForegroundColor Yellow
Write-Host "1. Przenieś istniejące pliki z starej lokalizacji (jeśli istnieją)" -ForegroundColor White
Write-Host "2. Zrestartuj API: pnpm dev:api" -ForegroundColor White
Write-Host "3. Sprawdź logi czy File Watcher wykrywa nowe ścieżki" -ForegroundColor White
