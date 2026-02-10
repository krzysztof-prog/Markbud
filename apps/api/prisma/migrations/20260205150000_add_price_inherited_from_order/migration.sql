-- Dodaj pole price_inherited_from_order do tabeli orders
-- Przechowuje numer zamówienia bazowego z którego odziedziczono cenę
-- np. "53477" dla zamówienia "53477-a"

ALTER TABLE orders ADD COLUMN price_inherited_from_order TEXT;
