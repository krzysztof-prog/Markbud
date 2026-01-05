#!/bin/bash

# Skrypt czyszczący stare pliki tymczasowe w apps/api/uploads/
# Usuwa pliki starsze niż 30 dni

UPLOADS_DIR="apps/api/uploads"
DAYS_OLD=30

echo "🧹 Czyszczenie starych plików w $UPLOADS_DIR..."
echo "   Pliki starsze niż $DAYS_OLD dni zostaną usunięte."
echo ""

# Sprawdź czy katalog istnieje
if [ ! -d "$UPLOADS_DIR" ]; then
    echo "❌ Błąd: Katalog $UPLOADS_DIR nie istnieje"
    exit 1
fi

# Znajdź i wyświetl pliki do usunięcia
echo "📋 Pliki do usunięcia:"
find "$UPLOADS_DIR" -type f -mtime +$DAYS_OLD -ls

# Policz pliki
FILE_COUNT=$(find "$UPLOADS_DIR" -type f -mtime +$DAYS_OLD | wc -l)

if [ "$FILE_COUNT" -eq 0 ]; then
    echo ""
    echo "✅ Brak plików do usunięcia"
    exit 0
fi

echo ""
echo "⚠️  Znaleziono $FILE_COUNT plików do usunięcia"
echo ""

# Potwierdź akcję
read -p "Czy chcesz kontynuować? (tak/nie): " confirm

if [ "$confirm" != "tak" ]; then
    echo "❌ Anulowano czyszczenie"
    exit 0
fi

# Usuń pliki
echo ""
echo "🗑️  Usuwanie plików..."
find "$UPLOADS_DIR" -type f -mtime +$DAYS_OLD -delete

echo "✅ Czyszczenie zakończone pomyślnie!"
echo "   Usunięto $FILE_COUNT plików"
