-- Int to BigInt for material value columns
-- SQLite nie rozróżnia INT/BIGINT (oba to INTEGER), więc ta migracja jest no-op na poziomie bazy.
-- Zmiana jest na poziomie Prisma schema (Int -> BigInt) aby Prisma Client poprawnie
-- obsługiwał wartości przekraczające 2,147,483,647 (max INT).
-- Dotyczy zleceń z dużą wartością materiału (np. 54093 = 6.5 mld groszy = ~65M PLN materiału).

-- RedefineTables (Prisma wymaga tego dla SQLite schema change)
-- W SQLite kolumny INTEGER nie mają limitu rozmiaru, więc dane są bezpieczne.
-- Ta migracja jest pusta - zmiana dotyczy tylko Prisma schema, nie struktury bazy.
