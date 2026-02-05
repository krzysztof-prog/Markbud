-- Migracja: Scalenie kolorów ' 1x'/' 2x' (akrobud) z 'RAL1x'/'RAL2x' (atypical)
-- Kolory ' 1x' i ' 2x' to duplikaty - prawdziwe kody to 'RAL1x' i 'RAL2x'
-- Przenosimy wszystkie powiązania i usuwamy duplikaty

-- ============================================================
-- KROK 1: Przenieś powiązania z ' 1x' na 'RAL1x'
-- ============================================================

-- OrderRequirement: zmień colorId z ' 1x' na 'RAL1x'
UPDATE order_requirements
SET color_id = (SELECT id FROM colors WHERE code = 'RAL1x')
WHERE color_id = (SELECT id FROM colors WHERE code = ' 1x')
  AND (SELECT id FROM colors WHERE code = 'RAL1x') IS NOT NULL
  AND (SELECT id FROM colors WHERE code = ' 1x') IS NOT NULL;

-- WarehouseStock: zmień colorId z ' 1x' na 'RAL1x'
-- Najpierw usuń potencjalne duplikaty (jeśli istnieje stock dla obu kolorów tego samego profilu)
DELETE FROM warehouse_stock
WHERE color_id = (SELECT id FROM colors WHERE code = ' 1x')
  AND profile_id IN (
    SELECT profile_id FROM warehouse_stock
    WHERE color_id = (SELECT id FROM colors WHERE code = 'RAL1x')
  );

UPDATE warehouse_stock
SET color_id = (SELECT id FROM colors WHERE code = 'RAL1x')
WHERE color_id = (SELECT id FROM colors WHERE code = ' 1x')
  AND (SELECT id FROM colors WHERE code = 'RAL1x') IS NOT NULL;

-- WarehouseOrder: zmień colorId z ' 1x' na 'RAL1x'
-- Najpierw usuń potencjalne duplikaty
DELETE FROM warehouse_orders
WHERE color_id = (SELECT id FROM colors WHERE code = ' 1x')
  AND profile_id IN (
    SELECT profile_id FROM warehouse_orders
    WHERE color_id = (SELECT id FROM colors WHERE code = 'RAL1x')
  );

UPDATE warehouse_orders
SET color_id = (SELECT id FROM colors WHERE code = 'RAL1x')
WHERE color_id = (SELECT id FROM colors WHERE code = ' 1x')
  AND (SELECT id FROM colors WHERE code = 'RAL1x') IS NOT NULL;

-- WarehouseHistory: zmień colorId z ' 1x' na 'RAL1x'
UPDATE warehouse_history
SET color_id = (SELECT id FROM colors WHERE code = 'RAL1x')
WHERE color_id = (SELECT id FROM colors WHERE code = ' 1x')
  AND (SELECT id FROM colors WHERE code = 'RAL1x') IS NOT NULL;

-- ProfileColor: zmień colorId z ' 1x' na 'RAL1x' (unikaj duplikatów)
DELETE FROM profile_colors
WHERE color_id = (SELECT id FROM colors WHERE code = ' 1x')
  AND profile_id IN (
    SELECT profile_id FROM profile_colors
    WHERE color_id = (SELECT id FROM colors WHERE code = 'RAL1x')
  );

UPDATE profile_colors
SET color_id = (SELECT id FROM colors WHERE code = 'RAL1x')
WHERE color_id = (SELECT id FROM colors WHERE code = ' 1x')
  AND (SELECT id FROM colors WHERE code = 'RAL1x') IS NOT NULL;

-- ============================================================
-- KROK 2: Przenieś powiązania z ' 2x' na 'RAL2x'
-- ============================================================

-- OrderRequirement: zmień colorId z ' 2x' na 'RAL2x'
UPDATE order_requirements
SET color_id = (SELECT id FROM colors WHERE code = 'RAL2x')
WHERE color_id = (SELECT id FROM colors WHERE code = ' 2x')
  AND (SELECT id FROM colors WHERE code = 'RAL2x') IS NOT NULL
  AND (SELECT id FROM colors WHERE code = ' 2x') IS NOT NULL;

-- WarehouseStock: zmień colorId z ' 2x' na 'RAL2x'
DELETE FROM warehouse_stock
WHERE color_id = (SELECT id FROM colors WHERE code = ' 2x')
  AND profile_id IN (
    SELECT profile_id FROM warehouse_stock
    WHERE color_id = (SELECT id FROM colors WHERE code = 'RAL2x')
  );

UPDATE warehouse_stock
SET color_id = (SELECT id FROM colors WHERE code = 'RAL2x')
WHERE color_id = (SELECT id FROM colors WHERE code = ' 2x')
  AND (SELECT id FROM colors WHERE code = 'RAL2x') IS NOT NULL;

-- WarehouseOrder: zmień colorId z ' 2x' na 'RAL2x'
DELETE FROM warehouse_orders
WHERE color_id = (SELECT id FROM colors WHERE code = ' 2x')
  AND profile_id IN (
    SELECT profile_id FROM warehouse_orders
    WHERE color_id = (SELECT id FROM colors WHERE code = 'RAL2x')
  );

UPDATE warehouse_orders
SET color_id = (SELECT id FROM colors WHERE code = 'RAL2x')
WHERE color_id = (SELECT id FROM colors WHERE code = ' 2x')
  AND (SELECT id FROM colors WHERE code = 'RAL2x') IS NOT NULL;

-- WarehouseHistory: zmień colorId z ' 2x' na 'RAL2x'
UPDATE warehouse_history
SET color_id = (SELECT id FROM colors WHERE code = 'RAL2x')
WHERE color_id = (SELECT id FROM colors WHERE code = ' 2x')
  AND (SELECT id FROM colors WHERE code = 'RAL2x') IS NOT NULL;

-- ProfileColor: zmień colorId z ' 2x' na 'RAL2x' (unikaj duplikatów)
DELETE FROM profile_colors
WHERE color_id = (SELECT id FROM colors WHERE code = ' 2x')
  AND profile_id IN (
    SELECT profile_id FROM profile_colors
    WHERE color_id = (SELECT id FROM colors WHERE code = 'RAL2x')
  );

UPDATE profile_colors
SET color_id = (SELECT id FROM colors WHERE code = 'RAL2x')
WHERE color_id = (SELECT id FROM colors WHERE code = ' 2x')
  AND (SELECT id FROM colors WHERE code = 'RAL2x') IS NOT NULL;

-- ============================================================
-- KROK 3: Usuń duplikaty kolorów ' 1x' i ' 2x'
-- ============================================================

DELETE FROM colors WHERE code = ' 1x';
DELETE FROM colors WHERE code = ' 2x';
