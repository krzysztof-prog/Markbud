-- Migration: Add initialQuantity and isQuantityUncertain to OkucStock + Seed okuc data
-- Date: 2026-01-21
-- Description: Dodaje pole stanu początkowego (remanent) i oznaczenie niepewnej ilości do magazynu okuć
--              oraz seeduje dane z remanentu ze stycznia 2026

-- Krok 1: Dodaj nowe kolumny do okuc_stocks
ALTER TABLE "okuc_stocks" ADD COLUMN "initial_quantity" INTEGER;
ALTER TABLE "okuc_stocks" ADD COLUMN "is_quantity_uncertain" BOOLEAN NOT NULL DEFAULT false;

-- Krok 2: Wyczyść istniejące dane okuć (zgodnie z decyzją użytkownika - nadpisz wszystko)
DELETE FROM "okuc_history";
DELETE FROM "okuc_order_items";
DELETE FROM "okuc_orders";
DELETE FROM "okuc_demands";
DELETE FROM "okuc_stocks";
DELETE FROM "okuc_proportions";
DELETE FROM "okuc_article_aliases";
DELETE FROM "okuc_articles";

-- Krok 3: Wstaw artykuły okuciowe z PDF (remanent styczeń 2026)
-- Artykuły z żółtym tłem = pewna ilość (is_quantity_uncertain = false)
-- Artykuły bez tła (szare/białe) = niepewna ilość (is_quantity_uncertain = true)
-- Artykuły z "?" = ilość 0, niepewna

INSERT INTO "okuc_articles" ("article_id", "name", "used_in_pvc", "used_in_alu", "order_class", "size_class", "order_unit", "lead_time_days", "safety_days", "created_at", "updated_at") VALUES
-- Strona 1 (żółte tło = pewna ilość)
('1200119', 'ZAWIAS FM SW1K 2T PCV BR LAKIEROWANY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('1200128', 'ZAWIAS FM SW1K 2T PCV BŁ LAKIEROWANY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('1202830', 'UCHWYT BALKONOWY PF PS9151 BŁ', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('1202831', 'UCHWYT BALKONOWY PF PS9152 BR', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('1209547', 'ZAWIAS FM SW1K 2T PCV SR', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('1811067', 'FSR ROZWÓRKA SR', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('1848601', 'DB 11/1 OGRANICZNIK SR OTWARCIA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('1898609', 'ESV 6-3-16 ZAWIAS RAMOWY SR', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('1997148', 'FBP-11 HAMULEC OKIENNY SR', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('1997367', 'FBP-11-650 HAMULEC OKIENNY SR', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2308084', 'AWDR PŁYTKA OPOROWA SR', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2822471', 'M.250-1 BLOKADA RYGLUJĄCA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2824919', 'MK.250-1 BLOKADA RYGLUJĄCA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2824986', 'MK.500-1 BLOKADA RYGLUJĄCA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2838464', 'MS.SU.500-1 BLOKADA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2838982', 'MS.SO.500-1 BLOKADA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2842244', 'E3 NAROŻNIK', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2842578', 'SK1.20-13. ROZWÓRKA PRAWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2842586', 'SK2.20-13. ROZWÓRKA PRAWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2844101', 'SK1.20-13. ROZWÓRKA LEWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2844143', 'SK2.20-13. ROZWÓRKA LEWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2844434', 'SL.KS.3-6 ZAWIAS ROZWÓRKI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2844602', 'EL.K.6-3-16 ZAWIAS RAMOWY SR', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2845277', 'K.SL.KS. OSŁONA ZAWIASU F9', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2845285', 'K.SK. OSŁONA ROZWÓRKI BŁ', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2845293', 'K.SK. OSŁONA ROZWÓRKI F9', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2846561', 'K.FL.K.OSŁ.ZAW.SKRZYDŁA F9', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2847141', 'OS1.600 RAMIĘ ROZWÓRKI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2848275', 'OS2.1025-1 RAMIĘ ROZWÓRKI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2848291', 'OS2.1250-1 RAMIĘ ROZWÓRKI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2848304', 'OS2.1475-1 RAMIĘ ROZWÓRKI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926168', 'SK2.E.20-13. ROZWÓRKA PRAWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926169', 'SK2.E.20-13. ROZWÓRKA LEWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926207', 'GAK.710 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926209', 'GAK.945-1 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926221', 'GAK.465 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926224', 'GAK.1550-1 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926225', 'GAK.1550-2 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926228', 'GAK.1775-2 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926234', 'GAK.1100-1 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
-- Strona 2
('4926267', 'GAM.800 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926269', 'GAM.1050-1 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926291', 'GAM.1400-1 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926292', 'GAM.1400-2 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926295', 'GAM.1800-2 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926373', 'SBS.K.12 ZACZEP ANTYWŁAMANIOWY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926374', 'SBK.K.12 ZACZEP UCHYLNY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926383', 'SK2.20-9. ROZWÓRKA PRAWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4926384', 'SK2.20-9. ROZWÓRKA LEWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4927112', 'GASM.800 PRZEKŁADNIA PRZYMYKOWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4927161', 'Gama.2300-3.d35', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4927558', 'K.SL.KS. OSŁONA ZAWIASU CW RAL9001', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4927562', 'K.FL.K. OSŁ. ZAW. SKRZYDŁA RAL 9001', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4927572', 'K.SK OSŁONA ROZWÓRKI RAL 9001', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4927927', 'GAVM.175-1 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4927928', 'GAVM.300-2 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4927929', 'GAVM.420-2 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4927940', 'GAVM.620-2 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4927941', 'GAVM.920-3 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4927942', 'GAVM.1320-3 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4927943', 'GAVM.1820-4 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4928429', 'FL.K.20-6-20 ZAW. SKRZ. SR', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4928979', 'OS2.800 RAMIĘ ROZWÓRKI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4928985', 'OS2.E.800 RAMIĘ ROZWÓRKI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4929185', 'MK.250-0 BLOKADA RYGLUJĄCA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4931450', 'TFE ELEMENT WIELOFUNKCYJNY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4931451', 'DFE ELEMENT DWUFUNKCYJNY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933295', 'K.SL.KS. OSLONA ZAWIASU BZ-RB (F4)', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933296', 'K.SK. OSŁONA ROZWÓRKI BZ-RB (F4)', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933298', 'K.FL.K. OSŁ. ZAW. SKRZYDŁA BZ-RB (F4)', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933544', 'DFE-TFE.S CZĘŚĆ RAMOWA DO SŁ. RUCHOM', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933545', 'DFE-TFE.S PRAWA (SŁ.R)', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933547', 'DFE-TFE.S LEWA (SŁ.R)', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933666', 'GASM.1050-1.E3 PRZEKŁADNIA PRZYMYKOWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933667', 'GASM.1400-1 PRZEKŁADNIA PRZYMYKOWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933700', 'GASM.1800-2 PRZEKŁADNIA PRZYMYKOWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933701', 'GASM.2300-3 PRZEKŁADNIA PRZYMYKOWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933702', 'GASK.945-1 PRZEKŁADNIA PRZYMYKOWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933703', 'GASK.1100-1 PRZEKŁADNIA PRZYMYKOWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933705', 'GASK.1325-1 PRZEKŁADNIA PRZYMYKOWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933707', 'GASK.1550-1 PRZEKŁADNIA PRZYMYKOWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933709', 'GASK.1775-2 PRZEKŁADNIA PRZYMYKOWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933721', 'GASK.2000-2 PRZEKŁADNIA PRZYMYKOWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933723', 'GASK.2225-2 PRZEKŁADNIA PRZYMYKOWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4933994', 'M.500-1 BLOKADA RYGLUJĄCA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4934014', 'MS.SO.250-1 BLOKADA GÓRNA RYGLUJĄCA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
-- Strona 3
('4934243', 'OS.SE.550 RAMIĘ ROZWÓRKI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4934244', 'OS.SE.800 RAMIĘ ROZWÓRKI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4934245', 'OS.SE.1025-1 RAMIĘ ROZWÓRKI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4934246', 'OS.SE.1250-1 RAMIĘ ROZWÓRKI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4935945', 'SBK.K.E.3 ADAPTER DO ZACZEPU', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4937603', 'AS.1 ŁĄCZNIK', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4937821', 'DFE-TFE CZĘŚĆ RAMOWA ZN', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4938089', 'GAK.2000-2 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4938122', 'GAK.2225-2 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4938163', 'GAM.2300-3 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4938169', 'GAM.2300-3.D35 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4939745', 'G.D.15,5 PŁYTKA ZABEZPIECZAJĄCA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4940652', 'M.750-1 BLOKADA RYGLUJĄCA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4940653', 'MK.750-1 BLOKADA RYGLUJĄCA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4940797', 'ZAWIAS FM SW1K 2T PCV F4 LAKIEROWANY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4940987', 'SK.100/160. KPL LEWY UCHYLNO-PRZESUWNY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4940989', 'SK.200. KPL LEWY UCHYLNO-PRZESUWNY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4940994', 'KPL NAROŻNIKÓW SK.Z.13.LEWY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4941020', 'KLAMKA ASG LEWA BIAŁA (211579)', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4941046', 'SK.1850-2 ŁĄCZNIK', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4941053', 'SK.AG.2100-2 KPL ZASUWNIC', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4941054', 'SK.AG.2300-2 KPL ZASUWNIC', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4941069', 'GAM.800.D30 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4941099', 'SK.1250 PROWADNICA BIAŁA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4941105', 'SK.160/200. BIAŁY KPL Z WZMOCNIENIAMI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4941109', 'SK.K.61 KPL ZACZEPÓW ZATRZASKOWYCH', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4941118', 'SK.2000. PROWADNICA BIAŁA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4941143', 'SK.61. LEWA BLOKADA OBROTU KLAMKI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4942190', 'SK.1250-1 ŁĄCZNIK', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4942706', 'V.AK.450-1 PRZEDŁUŻACZ', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4965496', 'SBA.A.73 ZACZEP PROSTY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4965497', 'SBK.A.73.ZN ZACZEP UCHYLNY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4966406', 'MK.VS.G.250.KG BLOKADA RYGLUJĄCA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4978659', 'GAK.1325-1 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4978670', 'GAK.1325-2 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4982891', 'KE ŁĄCZNIK', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4983721', 'VS.B.06 ZACZEP KONTAKTOWY – 4 ŻYŁY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4983723', 'VS.BK.06 ZACZEP KONTAKTOWY – 7 ZYŁ', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4984032', 'SBS.A.73 ZACZEP ANTYWŁAMANIOWY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4987907', 'FL.K.20-6-28.130 ZAWIAS SKRZYDŁOWY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4987933', 'SL.K.3-6.130 ZAWIAS ROZWÓRKI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4987940', 'K.FL.K.130. BIAŁA OSŁONA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4987952', 'K.SL.K.130. BIAŁA OSŁONA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4990509', 'ESV OSŁONA BIAŁA ZAWIASU RAMOWEGO', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4990530', 'ESV OSŁONA F9 ZAWIASU RAMOWEGO', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4990533', 'ESV OSŁONA RAL 9001', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
-- Strona 4
('4990590', 'ESV OSŁONA BZ-RB ZAWIASU RAMOWEGO (F4)', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4994354', 'ESV OSŁ.ZAW.RAM.SW25 RAL9005MAT', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4994391', 'E1.VS.KG.F NAROŻNIK', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4996413', 'FWSB-A 20-9 PRAWY ZAWIAS SKRZYDŁOWY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4996414', 'FWSB-A 20-9 LEWY ZAWIAS SKRZYDŁOWY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('4996828', 'GAVM.1520-3 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5001346', 'VS.KGS.04 ROLKA MAGNETYCZNA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5004125', 'SBA.K.576.M3 ZACZEP PROSTY KT', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5007006', 'RT.MSL.3 CZĘŚĆ RAMOWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5009226', 'K.SL.KS.OSŁ.ZAW.ROZW.SW25 RAL9005MAT', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5009462', '9005 SW OSŁONA ROZWÓRKI SW25 RAL9005MAT', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5012660', 'M.350-1 BLOKADA RYGLUJĄCA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5014974', 'VSAM.800 ŁĄCZNIK', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5014976', 'VSAM.1050-1 ŁĄCZNIK', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5014977', 'VSAM.1400-1 ŁĄCZNIK', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5015010', 'VSAM.2300-3 ŁĄCZNIK', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5015697', 'DB.IF OGRANICZNIK ROZWARCIA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5017998', 'DL.K.ET.20-13.P. PRAWY ZAWIAS ROZWIERNY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5017999', 'DL.K.ET.20-13.P. LEWY ZAWIAS ROZWIERNY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5018308', 'K.FL.K.130. F9 OSŁONA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5018332', 'DLS.IF.24-13 SZYNA ZAWIASU', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5018361', 'K.SL.K.130.F9 OSŁONA ZAWIASU', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5019146', 'E1.N NAROŻNIK', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5019147', 'E2.N NAROŻNIK', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5021551', 'GAK.2450-4 ZASUWNICA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5026984', 'E1.N.MSL. PRAWY NAROŻNIK', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5026985', 'E1.N.MSL. LEWY NAROŻNIK', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5029343', 'K.SL.K.130 OSŁONA BZ-RB (F4)', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5029347', 'K.FL.K.130 OSŁONA BZ-RB (F4)', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5031156', 'FSF BLOKADA OBROTU KLAMKI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5048941', 'ZSR ROZWÓRKA DODATKOWA SR', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5051287', 'E11 NAROŻNIK', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5058121', 'ESV 6-3-16 SA SR ZAWIAS RAMOWY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5068518', 'GASK.2450-4 PRZEKŁADNIA PRZYMYKOWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5073872', 'DFE-TFE.ZN.PRAWA CZĘŚĆ RAMOWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5073874', 'DFE-TFE.ZN. LEWA RAMOWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5075623', 'UCHWYT BALKONOWY RAL7016', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5076984', 'K.FL.K.OSŁ.ZAW.SKRZYDŁ.SW25 RAL9005MAT', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5077813', 'DB.K.IF.166. PRAWY ZACZEP OGRANICZNIKA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5077814', 'DB.K.IF.166. LEWY ZACZEP OGRANICZNIKA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5082076', 'KB.K.20-9 ZAWIAS UCHYLNY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5082080', 'KB.K.20-13 ZAWIAS UCHYLNY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5097141', 'K.FL.K. 130 CZARNA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5100452', 'EL.K.IF-N.166.ZAWIAS RAMOWY PRAWY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5100453', 'EL.K.IF-N.166.ZAWIAS RAMOWY LEWY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5100541', 'SK.IF-N.166.ROZWÓRKA PRAWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
-- Strona 5
('5100542', 'SK.IF-N.166.ROZWÓRKA LEWA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5100805', 'DL.K.IF-N.166. ZAWIAS ROZWIERNY PRAWY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5100806', 'DL.K.IF-N.166. ZAWIAS ROZWIERNY LEWY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5100821', 'FL.IF-N. PRAWY ZAWIAS SKRZYDŁOWY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5100822', 'FL.IF-N. LEWY ZAWIAS SKRZYDŁOWY', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5102161', 'ROZWÓRKA PPSK.1300.RS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5102162', 'ROZWÓRKA PPSK.1300.LS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5102163', 'ROZWÓRKA PPSK.2000RS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5102164', 'ROZWÓRKA PPSK.2000.LS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5102165', 'EL.RAMOWY ROZWÓRKI PPSK.K.3', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5102172', 'ZASUWNICA GAK.PP.2000-2', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5102173', 'ZASUWNICA GAK.PP.2225-2', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5102475', 'K.SL.K.130 CZARNA', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5103553', 'KPL. OSŁON PPSK.160/220.WS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5103556', 'KPL. OSŁON PPSK (BRAK NAZWY)', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5103557', 'KPL.OSŁON PPSK.160.220.SW25', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5103559', 'KPL. OSŁON PPSK.160/220.BZ-RB', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5104596', 'KPL. ROZWÓRKA ŚLIZG.PPSK.950.RS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5104597', 'KPL.ROZWÓRKA ŚLIZG. PPSK.950.LS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5104599', 'KPL. ROZÓWRKA ŚLIZG PPSK.1300.LS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5104600', 'KPL. ROZÓWRKA ŚLIZG PPSK.1650.RS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5104771', 'NAROŻNIK E1.PP', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5108526', 'KPL.PROWADNIC PPSK.2030.WS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5108530', 'KPL. PROWADNICPPSK.2030 SW.25', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5108533', 'KPL. PROWADNIC PPSK.2380.WS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5108536', 'KPL. PROWADNIC PPSK (BRAK NAZWY)', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5108554', 'KPL. PROWADNIC PPSK.3100.BZ-RB', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5112882', 'HF.KLAMKA PP.502/160.WS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5112885', 'HF.KLAMKA PP (BRAK NAZWY)', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5112888', 'HF.KLAMKA PP.502/160.F4', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5112889', 'HF.KLAMKA.PP.502A/160.WS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5112910', 'HF.UCHWYT MUSZLOWY PP.WS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5113481', 'K.SL.KS. OSLONA ZAWIASU BŁ', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5113482', 'K.FL.K. OSŁ. ZAW. SKRZYDŁA BŁ', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5113856', 'KPL. WÓZKÓW PPSK 100/160.RS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5113857', 'KPL. WÓZKÓW PPSK 100/160.LS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5113862', 'KPL. PROFILU MASK. PPSL.950.WS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5113866', 'KPL.PROFIL MASK PPSK.950.SW.25', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5113869', 'KPL. PROFILU MASK. PPSK.1300.WS', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5113872', 'KPL. PROFILU MASK. PPSK.1300.F9', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5113882', 'KPL. PROFILU MASK. PPSK.1650.BZ-RB', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5115569', 'FL.K. ZAŚLEPKA ZAWIASU BŁ', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5115571', 'MSL-OS. PRAWY MECHANIZM REGULACJI UCHYŁ', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5115572', 'MSL-OS. LEWY MECHANIZM REGULACJI UCHYŁU', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('5123528', 'E1.SE.N NAROŻNIK', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
-- Strona 6
('4926178', 'OS2.E.1250 RAMIĘ ROZWÓRKI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
-- Artykuł "brak" z PDF - traktujemy jako specjalny
('OS2E1025', 'OS2.E.1025 RAMIĘ ROZWÓRKI', true, false, 'typical', 'standard', 'piece', 14, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Krok 4: Wstaw stany magazynowe (PVC/production)
-- Żółte tło w PDF = pewna ilość (is_quantity_uncertain = false)
-- Szare/białe tło = niepewna ilość (is_quantity_uncertain = true)
-- "?" = ilość 0, niepewna

INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 16, 16, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '1200119';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 28, 28, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '1200128';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '1202830';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 14, 14, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '1202831';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 35, 35, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '1209547';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 18, 18, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '1811067';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '1848601';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 760, 760, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '1898609';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 5, 5, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '1997148';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 5, 5, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '1997367';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2308084';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2822471';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 16, 16, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2824919';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 3, 3, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2824986';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 9, 9, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2838464';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 14, 14, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2838982';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 214, 214, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2842244';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 84, 84, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2842578';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 962, 962, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2842586';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 74, 74, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2844101';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 937, 937, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2844143';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1603, 1603, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2844434';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1770, 1770, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2844602';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 131, 131, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2845277';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 631, 631, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2845285';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 95, 95, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2845293';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 144, 144, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2846561';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 113, 113, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2847141';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 529, 529, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2848275';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 46, 46, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2848291';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '2848304';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 10, 10, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926168';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 6, 6, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926169';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 5, 5, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926207';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 41, 41, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926209';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926221';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 198, 198, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926224';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 8, 8, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926225';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 32, 32, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926228';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 18, 18, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926234';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 64, 64, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926267';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 670, 670, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926269';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 407, 407, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926291';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 27, 27, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926292';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 36, 36, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926295';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 652, 652, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926373';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1480, 1480, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926374';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 9, 9, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926383';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 4, 4, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926384';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4927112';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4927161';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1928, 1928, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4927558';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 46, 46, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4927562';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 45, 45, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4927572';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 4, 4, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4927927';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4927928';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4927929';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 4, 4, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4927940';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 6, 6, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4927941';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4927942';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 5, 5, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4927943';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1931, 1931, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4928429';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1212, 1212, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4928979';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4928985';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 16, 16, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4929185';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 39, 39, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4931450';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 430, 430, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4931451';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 49, 49, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933295';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933296';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 123, 123, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933298';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933544';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 67, 67, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933545';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 49, 49, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933547';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 3, 3, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933666';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 2, 2, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933667';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 9, 9, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933700';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 10, 10, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933701';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 9, 9, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933702';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 18, 18, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933703';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 13, 13, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933705';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933707';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 7, 7, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933709';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 15, 15, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933721';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 8, 8, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933723';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1111, 1111, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4933994';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4934014';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 14, 14, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4934243';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 11, 11, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4934244';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 19, 19, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4934245';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4934246';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 24, 24, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4935945';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 25, 25, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4937603';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 1, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4937821';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 55, 55, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4938089';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 11, 11, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4938122';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 25, 25, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4938163';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4938169';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 69, 69, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4939745';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 200, 200, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4940652';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 80, 80, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4940653';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 62, 62, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4940797';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4940987';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 4, 4, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4940989';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4940994';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4941020';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4941046';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4941053';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4941054';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4941069';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4941099';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 2, 2, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4941105';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 2, 2, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4941109';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4941118';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4941143';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 3, 3, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4942190';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 65, 65, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4942706';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 354, 354, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4965496';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 33, 33, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4965497';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 2, 2, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4966406';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 70, 70, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4978659';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 4, 4, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4978670';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 44, 44, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4982891';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 30, 30, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4983721';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4983723';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 226, 226, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4984032';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 113, 113, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4987907';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 856, 856, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4987933';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 12, 12, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4987940';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 18, 18, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4987952';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 702, 702, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4990509';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 135, 135, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4990530';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 23, 23, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4990533';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 107, 107, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4990590';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 1, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4994354';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 20, 20, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4994391';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 13, 13, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4996413';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 8, 8, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4996414';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4996828';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 65, 65, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5001346';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 5858, 5858, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5004125';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 28, 28, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5007006';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 1, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5009226';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 1, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5009462';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5012660';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5014974';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 2, 2, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5014976';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5014977';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 3, 3, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5015010';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 59, 59, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5015697';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 1, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5017998';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 1, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5017999';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 58, 58, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5018308';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 18, 18, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5018332';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 70, 70, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5018361';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 2651, 2651, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5019146';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1248, 1248, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5019147';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 17, 17, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5021551';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 28, 28, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5026984';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 28, 28, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5026985';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 102, 102, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5029343';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 110, 110, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5029347';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5031156';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 2, 2, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5048941';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 8, 8, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5051287';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 23, 23, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5058121';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 3, 3, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5068518';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 82, 82, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5073872';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 74, 74, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5073874';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 11, 11, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5075623';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 1, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5076984';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 13, 13, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5077813';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 17, 17, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5077814';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 60, 60, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5082076';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 52, 52, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5082080';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5097141';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 14, 14, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5100452';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 24, 24, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5100453';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 17, 17, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5100541';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 14, 14, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5100542';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 9, 9, 1, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5100805';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 9, 9, 1, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5100806';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 9, 9, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5100821';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 22, 22, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5100822';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5102161';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5102162';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5102163';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5102164';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 2, 2, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5102165';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5102172';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5102173';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5102475';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 2, 2, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5103553';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5103556';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5103557';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5103559';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5104596';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5104597';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5104599';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5104600';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 2, 2, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5104771';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5108526';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5108530';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5108533';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5108536';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5108554';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 1, 1, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5112882';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5112885';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5112888';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5112889';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5112910';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 552, 552, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5113481';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 620, 620, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5113482';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 2, 2, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5113856';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5113857';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5113862';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5113866';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5113869';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5113872';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5113882';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 0, 0, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5115569';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 609, 609, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5115571';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 496, 496, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5115572';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 41, 41, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '5123528';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 35, 35, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '4926178';
INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', 3, 3, 0, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = 'OS2E1025';

-- Krok 5: Dodaj wpisy do historii (remanent początkowy)
INSERT INTO "okuc_history" ("article_id", "warehouse_type", "sub_warehouse", "event_type", "previous_qty", "change_qty", "new_qty", "reason", "reference", "recorded_at")
SELECT
    s."article_id",
    s."warehouse_type",
    s."sub_warehouse",
    'inventory',
    0,
    s."current_quantity",
    s."current_quantity",
    'Remanent początkowy - import ze stycznia 2026',
    'REMANENT-2026-01',
    CURRENT_TIMESTAMP
FROM "okuc_stocks" s;
