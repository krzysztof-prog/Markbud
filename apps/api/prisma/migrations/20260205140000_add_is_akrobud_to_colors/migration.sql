-- Dodaj pole is_akrobud do tabeli colors
-- Kolory z is_akrobud=true będą wyświetlane w Magazynie AKROBUD
-- Pozostałe kolory będą dostępne w Magazynie PVC

-- Krok 1: Dodaj kolumnę
ALTER TABLE colors ADD COLUMN is_akrobud BOOLEAN NOT NULL DEFAULT 0;

-- Krok 2: Oznacz kolory AKROBUD
-- Kolory z type='akrobud' - wszystkie powinny być widoczne w magazynie AKROBUD
UPDATE colors SET is_akrobud = 1 WHERE type = 'akrobud';

-- Kolory typowe - wszystkie są kolorami AKROBUD
UPDATE colors SET is_akrobud = 1 WHERE type = 'typical';
