-- Aktualizacja wartości wydajności na podstawie informacji od użytkownika
-- Akrobud: ~9 szkleń/h, ~6 skrzydeł/h (baza)
-- CT: 0.8 współczynnik (do dostosowania w UI)
-- Living: ~30% wolniej = współczynnik 0.7

UPDATE "production_efficiency_configs"
SET "glazings_per_hour" = 9.0, "wings_per_hour" = 6.0, "coefficient" = 1.0
WHERE "client_type" = 'akrobud';

UPDATE "production_efficiency_configs"
SET "glazings_per_hour" = 7.2, "wings_per_hour" = 4.8, "coefficient" = 0.8
WHERE "client_type" = 'ct';

UPDATE "production_efficiency_configs"
SET "glazings_per_hour" = 6.3, "wings_per_hour" = 4.2, "coefficient" = 0.7
WHERE "client_type" = 'living';

UPDATE "production_efficiency_configs"
SET "glazings_per_hour" = 9.0, "wings_per_hour" = 6.0, "coefficient" = 1.0
WHERE "client_type" = 'other';
