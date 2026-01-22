-- Dodanie pól systemów profilowych do tabeli profiles
-- Profile może należeć do wielu systemów jednocześnie

ALTER TABLE "profiles" ADD COLUMN "is_living" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "is_blok" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "is_vlak" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "is_ct70" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "is_focusing" BOOLEAN NOT NULL DEFAULT false;
