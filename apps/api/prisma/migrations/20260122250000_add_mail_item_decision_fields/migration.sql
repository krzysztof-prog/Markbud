-- Dodanie pól dla systemu decyzji diff w LogisticsMailItem
-- confirmedAt - kiedy użytkownik potwierdził pozycję
-- deletedAt - soft delete dla pozycji usuniętych przez użytkownika

ALTER TABLE "logistics_mail_items" ADD COLUMN "confirmed_at" DATETIME;
ALTER TABLE "logistics_mail_items" ADD COLUMN "deleted_at" DATETIME;
