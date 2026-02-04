-- Tabela logów decyzji dla modułu logistyki
-- AUDYT: zapisuje kto, kiedy, co zrobił z pozycją/dostawą
-- Pozwala odtworzyć historię zmian i rozstrzygać spory

CREATE TABLE "logistics_decision_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "from_version" INTEGER,
    "to_version" INTEGER,
    "metadata" TEXT,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mail_item_id" INTEGER,
    CONSTRAINT "logistics_decision_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "logistics_decision_logs_mail_item_id_fkey" FOREIGN KEY ("mail_item_id") REFERENCES "logistics_mail_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Indeksy dla szybkiego wyszukiwania
CREATE INDEX "logistics_decision_logs_entity_type_entity_id_idx" ON "logistics_decision_logs"("entity_type", "entity_id");
CREATE INDEX "logistics_decision_logs_user_id_idx" ON "logistics_decision_logs"("user_id");
CREATE INDEX "logistics_decision_logs_created_at_idx" ON "logistics_decision_logs"("created_at");
CREATE INDEX "logistics_decision_logs_action_idx" ON "logistics_decision_logs"("action");
