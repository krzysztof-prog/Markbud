# API Reference - AKROBUD

> Comprehensive reference for all REST API endpoints.
> Base URL: `http://localhost:5000` (prod) / `http://localhost:3001` (dev)
> Last updated: 2026-02-25

---

## Quick Lookup Table

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Auth** | | |
| POST | `/api/auth/login` | Logowanie użytkownika |
| POST | `/api/auth/logout` | Wylogowanie użytkownika (wymaga autoryzacji) |
| GET | `/api/auth/me` | Pobierz dane aktualnie zalogowanego użytkownika |
| **Users** | | |
| GET | `/api/users` | Lista użytkowników |
| GET | `/api/users/:id` | Pobierz użytkownika |
| POST | `/api/users` | Stwórz użytkownika |
| PUT | `/api/users/:id` | Zaktualizuj użytkownika |
| DELETE | `/api/users/:id` | Usuń użytkownika |
| **Profiles** | | |
| GET | `/api/profiles` | Get all aluminum profiles |
| GET | `/api/profiles/:id` | Get profile by ID |
| POST | `/api/profiles` | Create a new profile |
| PUT | `/api/profiles/:id` | Update an existing profile |
| DELETE | `/api/profiles/:id` | Delete a profile |
| PATCH | `/api/profiles/update-orders` | Update profile display orders |
| **Colors** | | |
| GET | `/api/colors` | List colors |
| GET | `/api/colors/:id` | Get by ID |
| POST | `/api/colors` | Create colors |
| PUT | `/api/colors/:id` | Update by ID |
| DELETE | `/api/colors/:id` | Delete by ID |
| PUT | `/api/colors/:colorId/profiles/:profileId/visibility` | Profiles Visibility |
| **Private Colors** | | |
| GET | `/api/private-colors` | Pobiera listę wszystkich kolorów prywatnych |
| PUT | `/api/private-colors/:id` | Aktualizuje nazwę koloru prywatnego |
| DELETE | `/api/private-colors/:id` | Usuwa kolor prywatny (tylko jeśli nie jest używany) |
| **Orders** | | |
| GET | `/api/orders` | List orders |
| GET | `/api/orders/search` | Search orders - optimized for GlobalSearch |
| GET | `/api/orders/completeness-stats` | Get completeness statistics for operator dashboard |
| GET | `/api/orders/:id` | Get by ID |
| GET | `/api/orders/by-number/:orderNumber` | Get by number |
| POST | `/api/orders` | Create orders |
| PUT | `/api/orders/:id` | Update by ID |
| DELETE | `/api/orders/:id` | Delete by ID |
| POST | `/api/orders/:id/archive` | Archive |
| POST | `/api/orders/:id/unarchive` | Unarchive |
| PATCH | `/api/orders/:id/manual-status` | Update manual status of an order (do_not_cut, cancelled, on_hold, or null to clear) |
| PATCH | `/api/orders/:id/special-type` | Update special type of an order (drzwi, psk, hs, ksztalt, or null to clear) |
| POST | `/api/orders/bulk-update-status` | Bulk Update Status |
| POST | `/api/orders/revert-production` | Cofnij produkcję (completed -> in_progress) |
| GET | `/api/orders/for-production` | Get for production |
| GET | `/api/orders/monthly-production` | Get orders completed in a specific month/year for production reports |
| PATCH | `/api/orders/:id` | partial update |
| GET | `/api/orders/:id/has-pdf` | check if PDF exists for order |
| GET | `/api/orders/:id/pdf` | download PDF file for order |
| GET | `/api/orders/:id/has-glass-order-txt` | Check if glass order TXT file exists for this order |
| GET | `/api/orders/:id/glass-order-txt` | Download glass order TXT file for this order |
| GET | `/api/orders/table/:colorId` | orders table for given color |
| GET | `/api/orders/requirements/totals` | get totals for each profile |
| GET | `/api/orders/:id/readiness` | Get production readiness checklist for an order (System Brain) |
| PATCH | `/api/orders/:id/variant-type` | Set variant type for an order (correction or additional_file) |
| GET | `/api/orders/archive/years` | Get available years in archive with order counts |
| GET | `/api/orders/archive/:year` | Get archived orders for a specific year (by completedAt year) |
| POST | `/api/orders/archive/trigger` | Manually trigger archive process (archives orders completed X days ago) |
| GET | `/api/orders/archive/settings` | Get archive settings (archiveAfterDays) |
| **Warehouse** | | |
| GET | `/api/warehouse/shortages` | All material shortages |
| GET | `/api/warehouse/history` | All warehouse history |
| GET | `/api/warehouse/:colorId` | Warehouse table for color |
| GET | `/api/warehouse/:colorId/average` | Monthly average usage |
| GET | `/api/warehouse/history/:colorId` | History for specific color |
| PUT | `/api/warehouse/:colorId/:profileId` | Update stock |
| POST | `/api/warehouse/monthly-update` | Monthly inventory update |
| POST | `/api/warehouse/rollback-inventory` | Rollback last inventory |
| POST | `/api/warehouse/finalize-month` | Finalize month (archive orders) |
| **Warehouse Orders** | | |
| GET | `/api/warehouse-orders` | pobierz wszystkie zamówienia (z filtrowaniem) |
| GET | `/api/warehouse-orders/:id` | pobierz jedno zamówienie |
| POST | `/api/warehouse-orders` | utwórz nowe zamówienie |
| PUT | `/api/warehouse-orders/:id` | aktualizuj zamówienie |
| DELETE | `/api/warehouse-orders/:id` | usuń zamówienie |
| **Deliveries** | | |
| POST | `/api/deliveries/validate-orders` | walidacja listy numerów zleceń |
| POST | `/api/deliveries/bulk-assign` | masowe przypisanie zleceń |
| GET | `/api/deliveries/for-date` | lista dostaw na datę |
| GET | `/api/deliveries/preview-number` | podgląd numeru następnej dostawy |
| GET | `/api/deliveries/readiness/batch` | Get aggregated readiness status for multiple deliveries |
| GET | `/api/deliveries` | List deliveries |
| GET | `/api/deliveries/calendar` | Get calendar |
| GET | `/api/deliveries/calendar-batch` | Batch calendar endpoint - combines deliveries, working days, and holidays |
| GET | `/api/deliveries/profile-requirements` | Get profile requirements |
| GET | `/api/deliveries/stats/windows/by-weekday` | Stats Windows By Weekday |
| GET | `/api/deliveries/stats/windows` | Stats Windows |
| GET | `/api/deliveries/stats/profiles` | Stats Profiles |
| GET | `/api/deliveries/:id` | Get by ID |
| POST | `/api/deliveries` | Create deliveries |
| PUT | `/api/deliveries/:id` | Update by ID |
| DELETE | `/api/deliveries/:id` | Delete by ID |
| POST | `/api/deliveries/:id/orders` | Orders |
| DELETE | `/api/deliveries/:id/orders/:orderId` | Delete orders |
| PUT | `/api/deliveries/:id/orders/reorder` | Orders Reorder |
| POST | `/api/deliveries/:id/move-order` | Move Order |
| POST | `/api/deliveries/:id/items` | Items |
| DELETE | `/api/deliveries/:id/items/:itemId` | Delete items |
| POST | `/api/deliveries/:id/complete` | Complete |
| POST | `/api/deliveries/:id/complete-all-orders` | Complete All Orders |
| GET | `/api/deliveries/:id/protocol` | Get protocol |
| GET | `/api/deliveries/:id/protocol/pdf` | Protocol Pdf |
| PATCH | `/api/deliveries/bulk-update-dates` | Bulk operations |
| GET | `/api/deliveries/:id/readiness` | Get aggregated readiness status for a delivery |
| GET | `/api/deliveries/:id/label-check` | Get latest label check for a delivery |
| **Settings** | | |
| GET | `/api/settings` | List settings |
| PUT | `/api/settings` | PUT settings |
| GET | `/api/settings/pallet-types` | Get pallet types |
| POST | `/api/settings/pallet-types` | Pallet Types |
| PUT | `/api/settings/pallet-types/:id` | Update pallet types |
| DELETE | `/api/settings/pallet-types/:id` | Delete pallet types |
| GET | `/api/settings/packing-rules` | Get packing rules |
| POST | `/api/settings/packing-rules` | Packing Rules |
| PUT | `/api/settings/packing-rules/:id` | Update packing rules |
| DELETE | `/api/settings/packing-rules/:id` | Delete packing rules |
| GET | `/api/settings/user-folder-path` | User Folder Settings routes (wymaga auth - handler potrzebuje userId) |
| PUT | `/api/settings/user-folder-path` | Update user folder path |
| GET | `/api/settings/document-author-mappings` | Document Author Mappings routes |
| POST | `/api/settings/document-author-mappings` | Document Author Mappings |
| PUT | `/api/settings/document-author-mappings/:id` | Update document author mappings |
| DELETE | `/api/settings/document-author-mappings/:id` | Delete document author mappings |
| GET | `/api/settings/browse-folders` | przeglądaj foldery Windows |
| POST | `/api/settings/validate-folder` | sprawdź czy folder istnieje |
| GET | `/api/settings/file-watcher/status` | status i sciezki file watchera |
| POST | `/api/settings/file-watcher/restart` | restartuj file watcher |
| POST | `/api/settings/document-author-mappings/backfill` | zaktualizuj istniejące zlecenia |
| GET | `/api/settings/soft-delete-cleanup/status` | status schedulera i statystyki |
| GET | `/api/settings/soft-delete-cleanup/dry-run` | podglad co zostanie usuniete |
| POST | `/api/settings/soft-delete-cleanup/run` | reczne uruchomienie cleanup |
| GET | `/api/settings/:key` | /document-author-mappings, /browse-folders itd. |
| PUT | `/api/settings/:key` | Update by ID |
| **Imports** | | |
| POST | `/api/imports/upload` | Upload |
| GET | `/api/imports` | List imports |
| GET | `/api/imports/pending` | Get pending |
| GET | `/api/imports/list-folders` | Folder operations |
| GET | `/api/imports/scan-folder` | Get scan folder |
| POST | `/api/imports/folder` | Folder |
| POST | `/api/imports/archive-folder` | Archive Folder |
| DELETE | `/api/imports/delete-folder` | Delete delete folder |
| GET | `/api/imports/preview` | Preview and process by filepath (with variant conflict detection) |
| POST | `/api/imports/process` | Process |
| POST | `/api/imports/bulk` | Bulk operations |
| GET | `/api/imports/:id` | Single import operations |
| GET | `/api/imports/:id/preview` | Get preview |
| POST | `/api/imports/:id/approve` | Approve |
| POST | `/api/imports/:id/reject` | Reject |
| DELETE | `/api/imports/:id` | Delete by ID |
| GET | `/api/imports/queue/status` | Import queue status (for monitoring) |
| POST | `/api/imports/queue/pause` | Pause queue |
| POST | `/api/imports/queue/resume` | Resume queue |
| DELETE | `/api/imports/queue/clear` | Clear queue |
| **Dashboard** | | |
| GET | `/api/dashboard` | Main dashboard data |
| GET | `/api/dashboard/alerts` | Dashboard alerts |
| GET | `/api/dashboard/stats/weekly` | Weekly statistics (8 weeks) |
| GET | `/api/dashboard/stats/monthly` | Monthly statistics |
| GET | `/api/dashboard/operator` | Get operator dashboard with completeness statistics |
| **Working Days** | | |
| GET | `/api/working-days` | pobierz dni wolne dla zakresu dat |
| GET | `/api/working-days/holidays` | pobierz święta dla roku |
| POST | `/api/working-days` | ustaw dzień jako wolny/pracujący |
| DELETE | `/api/working-days/:date` | usuń oznaczenie (przywróć domyślny stan) |
| **Schuco** | | |
| GET | `/api/schuco/deliveries` | Get Schuco deliveries with pagination |
| POST | `/api/schuco/refresh` | Trigger manual refresh of Schuco deliveries |
| GET | `/api/schuco/status` | Get status of last Schuco fetch |
| GET | `/api/schuco/logs` | Get history of Schuco fetches |
| GET | `/api/schuco/statistics` | Get statistics about deliveries by changeType |
| GET | `/api/schuco/debug/changed` | DEBUG: Get changed records count |
| POST | `/api/schuco/sync-links` | Synchronize all Schuco deliveries with orders (creates missing links) |
| GET | `/api/schuco/unlinked` | Get Schuco deliveries without order links |
| POST | `/api/schuco/links` | Create manual link between order and Schuco delivery |
| DELETE | `/api/schuco/links/:id` | Delete link between order and Schuco delivery |
| GET | `/api/schuco/by-week` | Get Schuco deliveries grouped by delivery week |
| POST | `/api/schuco/cleanup-pending` | Clean up stale pending logs (older than 10 minutes) |
| POST | `/api/schuco/cancel` | Cancel active Schuco import |
| GET | `/api/schuco/is-running` | Check if Schuco import is currently running |
| GET | `/api/schuco/archive` | Get archived Schuco deliveries with pagination |
| GET | `/api/schuco/archive/stats` | Get statistics about archived deliveries |
| POST | `/api/schuco/archive/run` | Manually trigger archiving of old completed deliveries |
| GET | `/api/schuco/settings/filter-days` | Get the number of days for Schuco date filter |
| PUT | `/api/schuco/settings/filter-days` | Update the number of days for Schuco date filter |
| GET | `/api/schuco/settings/filter-date` | Get the specific date for Schuco date filter |
| PUT | `/api/schuco/settings/filter-date` | Update the specific date for Schuco date filter (format: YYYY-MM-DD) |
| DELETE | `/api/schuco/settings/filter-date` | Clear the specific filter date (will use filter-days instead) |
| GET | `/api/schuco/items/stats` | Get statistics about order items |
| GET | `/api/schuco/items/is-running` | Check if order items fetch is currently running |
| POST | `/api/schuco/items/fetch` | Trigger manual fetch of order items from Schuco. Mode: missing (default), all, from-date |
| POST | `/api/schuco/items/clear-old-changes` | Clear change markers older than 72 hours |
| POST | `/api/schuco/items/refresh` | Refresh stale order items (items fetched more than X days ago) |
| GET | `/api/schuco/items/scheduler-status` | Get status of automatic item fetch scheduler |
| POST | `/api/schuco/items/scheduler/start` | Start automatic item fetch scheduler (every 45 minutes) |
| POST | `/api/schuco/items/scheduler/stop` | Stop automatic item fetch scheduler |
| POST | `/api/schuco/items/auto-fetch` | Manually trigger auto-fetch for changed items (one-time) |
| GET | `/api/schuco/items/stale-count` | Get count of deliveries with stale items |
| GET | `/api/schuco/items/:deliveryId` | Get order items for a specific Schuco delivery |
| **Pallets** | | |
| POST | `/api/pallets/optimize/:deliveryId` | Uruchom optymalizację pakowania dla dostawy |
| GET | `/api/pallets/optimization/:deliveryId` | Pobierz zapisaną optymalizację |
| DELETE | `/api/pallets/optimization/:deliveryId` | Usuń optymalizację |
| GET | `/api/pallets/export/:deliveryId` | Eksportuj optymalizację do PDF |
| GET | `/api/pallets/types` | Pobierz wszystkie typy palet |
| POST | `/api/pallets/types` | Utwórz nowy typ palety |
| PATCH | `/api/pallets/types/:id` | Zaktualizuj typ palety |
| DELETE | `/api/pallets/types/:id` | Usuń typ palety |
| GET | `/api/pallets/rules` | Pobierz reguły pakowania |
| POST | `/api/pallets/rules` | Utwórz nową regułę pakowania |
| PATCH | `/api/pallets/rules/:id` | Zaktualizuj regułę pakowania |
| DELETE | `/api/pallets/rules/:id` | Usuń regułę pakowania |
| **Currency Config** | | |
| GET | `/api/currency-config/current` | Get current EUR to PLN exchange rate |
| GET | `/api/currency-config/history` | Get exchange rate history |
| POST | `/api/currency-config` | Update EUR to PLN exchange rate |
| POST | `/api/currency-config/convert/eur-to-pln` | Convert EUR amount to PLN using current rate |
| POST | `/api/currency-config/convert/pln-to-eur` | Convert PLN amount to EUR using current rate |
| **Monthly Reports** | | |
| GET | `/api/monthly-reports` | Get all monthly reports |
| GET | `/api/monthly-reports/:year/:month` | Get monthly report for specific year and month |
| POST | `/api/monthly-reports/:year/:month/generate` | Generate monthly report for specific year and month |
| GET | `/api/monthly-reports/:year/:month/export/excel` | Export monthly report to Excel |
| GET | `/api/monthly-reports/:year/:month/export/pdf` | Export monthly report to PDF |
| DELETE | `/api/monthly-reports/:year/:month` | Delete monthly report |
| **Profile Depths** | | |
| GET | `/api/profile-depths` | Get all profile depths |
| GET | `/api/profile-depths/:id` | Get profile depth by ID |
| POST | `/api/profile-depths` | Create new profile depth |
| PATCH | `/api/profile-depths/:id` | Update profile depth |
| DELETE | `/api/profile-depths/:id` | Delete profile depth |
| **Profile Pallet Configs** | | |
| GET | `/api/profile-pallet-configs` | Pobierz wszystkie przeliczniki |
| GET | `/api/profile-pallet-configs/:id` | Pobierz przelicznik po ID |
| POST | `/api/profile-pallet-configs` | Dodaj nowy przelicznik |
| PATCH | `/api/profile-pallet-configs/:id` | Edytuj przelicznik |
| DELETE | `/api/profile-pallet-configs/:id` | Usuń przelicznik |
| **Glass Orders** | | |
| GET | `/api/glass-orders` | Glass order endpoints (no authentication required in development) |
| GET | `/api/glass-orders/:id` | Get by ID |
| POST | `/api/glass-orders/import` | Import endpoint (debug logging moved to handler) |
| POST | `/api/glass-orders/rematch` | Re-match all glass orders to production orders (recalculate orderedGlassCount) |
| DELETE | `/api/glass-orders/:id` | Delete by ID |
| GET | `/api/glass-orders/:id/summary` | Get summary |
| GET | `/api/glass-orders/:id/validations` | Get validations |
| PATCH | `/api/glass-orders/:id/status` | Update status |
| **Glass Deliveries** | | |
| GET | `/api/glass-deliveries/latest-import/summary` | Glass delivery endpoints (no authentication required in development) |
| GET | `/api/glass-deliveries` | List glass deliveries |
| GET | `/api/glass-deliveries/:id` | Get by ID |
| POST | `/api/glass-deliveries/import` | Import |
| DELETE | `/api/glass-deliveries/:id` | Delete by ID |
| GET | `/api/glass-deliveries/categorized/loose` | Kategoryzowane szyby |
| GET | `/api/glass-deliveries/categorized/aluminum` | Categorized Aluminum |
| GET | `/api/glass-deliveries/categorized/aluminum/summary` | Categorized Aluminum Summary |
| GET | `/api/glass-deliveries/categorized/reclamation` | Categorized Reclamation |
| **Glass Validations** | | |
| GET | `/api/glass-validations/dashboard` | Get glass validation dashboard with statistics |
| GET | `/api/glass-validations/order/:orderNumber` | Get validations for a specific order |
| GET | `/api/glass-validations/order/:orderNumber/details` | Get detailed glass discrepancies for an order - comparison per dimension with delivery info |
| GET | `/api/glass-validations` | Get all glass validations with optional filters |
| POST | `/api/glass-validations/:id/resolve` | Resolve a glass validation issue |
| **Cleanup Pending Prices** | | |
| GET | `/api/cleanup/pending-prices/statistics` | Get cleanup statistics for pending order prices |
| GET | `/api/cleanup/pending-prices/config` | Get cleanup configuration |
| GET | `/api/cleanup/pending-prices/scheduler/status` | Get cleanup scheduler status |
| POST | `/api/cleanup/pending-prices/run` | Manually trigger cleanup process |
| GET | `/api/cleanup/pending-prices/prices` | Get all pending order prices (optionally filtered by status) |
| POST | `/api/cleanup/pending-prices/rematch` | Re-match all pending prices to existing orders |
| POST | `/api/cleanup/pending-prices/reimport` | Force reimport specific PDF files, create pending prices, and run rematch |
| **Okuc** | | |
| GET | `/api/okuc/health` | Health check for the module |
| GET | `/api/okuc/articles` | List all articles with optional filters |
| GET | `/api/okuc/articles/pending-review` | List all articles awaiting orderClass verification |
| POST | `/api/okuc/articles/batch-update-order-class` | Update orderClass for multiple articles at once |
| GET | `/api/okuc/articles/:id` | Get article by ID |
| GET | `/api/okuc/articles/by-article-id/:articleId` | Get article by articleId |
| POST | `/api/okuc/articles` | Create a new article |
| PATCH | `/api/okuc/articles/:id` | Update an article |
| DELETE | `/api/okuc/articles/:id` | Delete an article |
| POST | `/api/okuc/articles/:id/aliases` | Add an alias to an article |
| GET | `/api/okuc/articles/:id/aliases` | Get all aliases for an article |
| POST | `/api/okuc/articles/import/preview` | Preview CSV import - detect conflicts before importing |
| POST | `/api/okuc/articles/import` | Import articles from CSV file with conflict resolution |
| GET | `/api/okuc/articles/export` | Export articles to CSV file |
| GET | `/api/okuc/stock` | List all stock with optional filters |
| GET | `/api/okuc/stock/summary` | Get stock summary grouped by warehouse |
| POST | `/api/okuc/stock/import/preview` | Preview stock import from CSV file |
| POST | `/api/okuc/stock/import` | Import stock with conflict resolution |
| GET | `/api/okuc/stock/export` | Export stock to CSV |
| GET | `/api/okuc/stock/below-minimum` | Get stock items below minimum level |
| GET | `/api/okuc/stock/:id` | Get stock by ID |
| GET | `/api/okuc/stock/by-article/:articleId` | Get stock by article ID and warehouse type |
| PATCH | `/api/okuc/stock/:id` | Update stock quantity |
| POST | `/api/okuc/stock/adjust` | Adjust stock quantity |
| GET | `/api/okuc/stock/history/:articleId` | Get stock history for an article |
| GET | `/api/okuc/demand` | List all demands with optional filters |
| GET | `/api/okuc/demand/summary` | Get demand summary grouped by week |
| GET | `/api/okuc/demand/:id` | Get demand by ID |
| POST | `/api/okuc/demand` | Create a new demand |
| PUT | `/api/okuc/demand/:id` | Update existing demand |
| DELETE | `/api/okuc/demand/:id` | Delete demand |
| GET | `/api/okuc/orders` | List all orders with optional filters |
| GET | `/api/okuc/orders/stats` | Get order statistics |
| GET | `/api/okuc/orders/:id` | Get order by ID |
| POST | `/api/okuc/orders` | Create a new order |
| PUT | `/api/okuc/orders/:id` | Update existing order |
| POST | `/api/okuc/orders/:id/receive` | Mark order as received and update received quantities |
| DELETE | `/api/okuc/orders/:id` | Delete order (only if draft) |
| POST | `/api/okuc/orders/import/parse` | Parsuje plik XLSX i zwraca podgląd danych do zatwierdzenia |
| POST | `/api/okuc/orders/import/confirm` | Zatwierdza import i tworzy zamówienie |
| GET | `/api/okuc/proportions` | List all proportions with optional filters |
| GET | `/api/okuc/proportions/chains/:sourceArticleId` | Get proportion chains starting from source article |
| GET | `/api/okuc/proportions/article/:articleId` | Get proportions by article (both as source and target) |
| GET | `/api/okuc/proportions/:id` | Get proportion by ID |
| POST | `/api/okuc/proportions` | Create new proportion |
| PUT | `/api/okuc/proportions/:id` | Update proportion |
| POST | `/api/okuc/proportions/:id/deactivate` | Deactivate proportion (soft delete) |
| POST | `/api/okuc/proportions/:id/activate` | Activate proportion |
| DELETE | `/api/okuc/proportions/:id` | Delete proportion (hard delete) |
| GET | `/api/okuc/locations` | List all active warehouse locations |
| POST | `/api/okuc/locations` | Create a new warehouse location |
| POST | `/api/okuc/locations/reorder` | Reorder warehouse locations |
| PATCH | `/api/okuc/locations/:id` | Update a warehouse location |
| DELETE | `/api/okuc/locations/:id` | Delete a warehouse location (soft delete) |
| GET | `/api/okuc/replacements` | Pobierz listę wszystkich mapowań zastępstw artykułów |
| POST | `/api/okuc/replacements` | Ustaw lub zmień mapowanie zastępstwa artykułu |
| DELETE | `/api/okuc/replacements/:id` | Usuń mapowanie zastępstwa (cofnij wygaszanie artykułu) |
| POST | `/api/okuc/replacements/:id/transfer` | Ręcznie przenieś zapotrzebowanie z artykułu wygaszanego na zamiennik |
| **Akrobud Verification** | | |
| GET | `/api/akrobud-verification` | Pobierz wszystkie listy |
| POST | `/api/akrobud-verification/parse-mail` | Parsuj treść maila (preview) |
| POST | `/api/akrobud-verification/preview-projects` | Preview projektów |
| POST | `/api/akrobud-verification/versions` | Utwórz nową wersję listy |
| GET | `/api/akrobud-verification/versions` | Pobierz wersje dla daty |
| POST | `/api/akrobud-verification/compare-versions` | Porównaj wersje |
| GET | `/api/akrobud-verification/:id` | Pobierz listę po ID |
| GET | `/api/akrobud-verification/:id/versions` | Historia wersji listy |
| POST | `/api/akrobud-verification/:id/verify-projects` | Weryfikuj listę projektów |
| POST | `/api/akrobud-verification` | Utwórz listę |
| PUT | `/api/akrobud-verification/:id` | Aktualizuj listę |
| DELETE | `/api/akrobud-verification/:id` | Usuń listę (soft delete) |
| POST | `/api/akrobud-verification/:id/items` | Dodaj elementy do listy |
| POST | `/api/akrobud-verification/:id/items/parse` | Parsuj tekst (preview) |
| DELETE | `/api/akrobud-verification/:id/items/:itemId` | Usuń element |
| DELETE | `/api/akrobud-verification/:id/items` | Wyczyść wszystkie elementy |
| POST | `/api/akrobud-verification/:id/verify` | Weryfikuj listę |
| POST | `/api/akrobud-verification/:id/apply` | Zastosuj zmiany |
| **Timesheets** | | |
| GET | `/api/timesheets/workers` | Lista pracowników |
| GET | `/api/timesheets/workers/:id` | Szczegóły pracownika |
| POST | `/api/timesheets/workers` | Dodaj pracownika |
| PUT | `/api/timesheets/workers/:id` | Aktualizuj pracownika |
| DELETE | `/api/timesheets/workers/:id` | Dezaktywuj pracownika (soft delete) |
| GET | `/api/timesheets/positions` | Lista stanowisk |
| GET | `/api/timesheets/positions/:id` | Szczegóły stanowiska |
| POST | `/api/timesheets/positions` | Dodaj stanowisko |
| PUT | `/api/timesheets/positions/:id` | Aktualizuj stanowisko |
| GET | `/api/timesheets/task-types` | Lista typów zadań nieprodukcyjnych |
| GET | `/api/timesheets/task-types/:id` | Szczegóły typu zadania |
| POST | `/api/timesheets/task-types` | Dodaj typ zadania |
| PUT | `/api/timesheets/task-types/:id` | Aktualizuj typ zadania |
| GET | `/api/timesheets/special-work-types` | Lista typów nietypówek |
| GET | `/api/timesheets/special-work-types/:id` | Szczegóły typu nietypówki |
| POST | `/api/timesheets/special-work-types` | Dodaj typ nietypówki |
| PUT | `/api/timesheets/special-work-types/:id` | Aktualizuj typ nietypówki |
| PATCH | `/api/timesheets/special-work-types/:id/toggle` | Przełącz aktywność typu nietypówki |
| GET | `/api/timesheets/entries` | Lista wpisów (z filtrowaniem po dacie/pracowniku) |
| GET | `/api/timesheets/entries/:id` | Szczegóły wpisu |
| POST | `/api/timesheets/entries` | Dodaj wpis |
| PUT | `/api/timesheets/entries/:id` | Aktualizuj wpis |
| DELETE | `/api/timesheets/entries/:id` | Usuń wpis |
| POST | `/api/timesheets/set-standard-day` | Ustaw standardowy dzień dla wielu pracowników |
| POST | `/api/timesheets/set-absence-range` | Ustaw nieobecność na zakres dat |
| GET | `/api/timesheets/calendar` | Podsumowanie kalendarza na miesiąc |
| GET | `/api/timesheets/day-summary` | Podsumowanie dnia |
| **Pallet Stock** | | |
| GET | `/api/pallet-stock/day/:date` | Pobierz dane dnia paletowego |
| PUT | `/api/pallet-stock/day/:date` | Aktualizuj wpisy dnia paletowego |
| POST | `/api/pallet-stock/day/:date/close` | Zamknij dzien paletowy |
| POST | `/api/pallet-stock/day/:date/entries/:type/correct` | Koryguj stan poczatkowy |
| GET | `/api/pallet-stock/month/:year/:month` | Pobierz podsumowanie miesiaca |
| GET | `/api/pallet-stock/calendar/:year/:month` | Pobierz kalendarz miesiaca |
| GET | `/api/pallet-stock/alerts/config` | Pobierz konfiguracje alertow |
| PUT | `/api/pallet-stock/alerts/config` | Aktualizuj konfiguracje alertow |
| GET | `/api/pallet-stock/initial` | Pobierz stany początkowe |
| PUT | `/api/pallet-stock/initial` | Ustaw stany początkowe (admin only) |
| **Production Reports** | | |
| GET | `/api/production-reports/:year/:month/pdf` | Eksport PDF raportu - wszyscy zalogowani (MUSI być przed /:year/:month) |
| GET | `/api/production-reports/:year/:month/summary` | Pobierz podsumowania (MUSI być przed /:year/:month) |
| GET | `/api/production-reports/:year/:month/invoice-auto-fill-preview` | Preview auto-fill FV - manager/admin/accountant (MUSI być przed /:year/:month) |
| POST | `/api/production-reports/:year/:month/invoice-auto-fill` | Wykonaj auto-fill FV - manager/admin/accountant (MUSI być przed /:year/:month) |
| GET | `/api/production-reports/:year/:month` | Pobierz raport dla miesiąca |
| PUT | `/api/production-reports/:year/:month/items/:orderId` | Aktualizuj pozycję raportu (ilości, RW) - manager/admin |
| PUT | `/api/production-reports/:year/:month/items/:orderId/invoice` | Aktualizuj dane FV - manager/admin/accountant |
| PATCH | `/api/production-reports/:year/:month/items/:orderId/verify` | Oznacz zlecenie jako sprawdzone/niesprawdzone - manager/admin |
| PUT | `/api/production-reports/:year/:month/atypical` | Aktualizuj nietypówki - manager/admin |
| POST | `/api/production-reports/:year/:month/close` | Zamknij miesiąc - manager/admin |
| POST | `/api/production-reports/:year/:month/reopen` | Odblokuj miesiąc - manager/admin |
| **Bug Reports** | | |
| POST | `/api/bug-reports` | Zgłoś problem lub błąd w aplikacji |
| GET | `/api/bug-reports` | Pobierz ostatnie zgłoszenia błędów (tylko ADMIN) |
| **Moja Praca** | | |
| GET | `/api/moja-praca/conflicts` | Lista konfliktów użytkownika |
| GET | `/api/moja-praca/conflicts/count` | Liczba konfliktów (dla badge w sidebar) |
| GET | `/api/moja-praca/conflicts/:id` | Szczegóły konfliktu z danymi bazowego zlecenia |
| POST | `/api/moja-praca/conflicts/:id/resolve` | Rozwiąż konflikt |
| POST | `/api/moja-praca/conflicts/bulk-resolve` | Rozwiąż wiele konfliktów naraz |
| GET | `/api/moja-praca/orders` | Zlecenia użytkownika na dany dzień |
| GET | `/api/moja-praca/deliveries` | Dostawy zawierające zlecenia użytkownika |
| GET | `/api/moja-praca/glass-orders` | Zamówienia szyb dla zleceń użytkownika |
| GET | `/api/moja-praca/summary` | Podsumowanie dnia dla użytkownika |
| GET | `/api/moja-praca/alerts` | Wszystkie alerty (zlecenia bez cen + problemy z etykietami) |
| GET | `/api/moja-praca/alerts/orders-without-price` | Zlecenia Akrobud w produkcji bez cen |
| GET | `/api/moja-praca/alerts/label-issues` | Dostawy z problemami etykiet |
| **Production Planning** | | |
| GET | `/api/production-planning/efficiency-configs` | Get efficiency configs |
| GET | `/api/production-planning/efficiency-configs/:id` | Get efficiency configs |
| POST | `/api/production-planning/efficiency-configs` | Efficiency Configs |
| PUT | `/api/production-planning/efficiency-configs/:id` | Update efficiency configs |
| DELETE | `/api/production-planning/efficiency-configs/:id` | Delete efficiency configs |
| GET | `/api/production-planning/settings` | Get settings |
| GET | `/api/production-planning/settings/:key` | Get settings |
| POST | `/api/production-planning/settings` | Settings |
| PUT | `/api/production-planning/settings/:key` | Update settings |
| DELETE | `/api/production-planning/settings/:key` | Delete settings |
| GET | `/api/production-planning/calendar` | Get calendar |
| POST | `/api/production-planning/calendar` | Calendar |
| DELETE | `/api/production-planning/calendar/:date` | Delete calendar |
| GET | `/api/production-planning/profiles/palletized` | Profiles Palletized |
| PATCH | `/api/production-planning/profiles/:id/palletized` | Profiles Palletized |
| PATCH | `/api/production-planning/profiles/palletized/bulk` | Profiles Palletized Bulk |
| GET | `/api/production-planning/colors/typical` | Colors Typical |
| PATCH | `/api/production-planning/colors/:id/typical` | Colors Typical |
| PATCH | `/api/production-planning/colors/typical/bulk` | Colors Typical Bulk |
| **Steel** | | |
| GET | `/api/steel` | lista wszystkich stali |
| GET | `/api/steel/with-stock` | lista stali ze stanem magazynowym |
| GET | `/api/steel/:id` | pojedyncza stal |
| POST | `/api/steel` | dodaj nową stal |
| PUT | `/api/steel/:id` | aktualizuj stal |
| DELETE | `/api/steel/:id` | usuń stal |
| PATCH | `/api/steel/update-orders` | zmień kolejność stali |
| GET | `/api/steel/history` | historia zmian stanu magazynowego |
| GET | `/api/steel/:id/stock` | pobierz stan magazynowy |
| PATCH | `/api/steel/:id/stock` | aktualizuj stan magazynowy |
| **Label Checks** | | |
| GET | `/api/label-checks` | Get all label checks with filters and pagination |
| GET | `/api/label-checks/statistics` | Get label check statistics |
| GET | `/api/label-checks/delivery/:id` | Get latest label check for a delivery |
| GET | `/api/label-checks/delivery/:id/summary` | Get label check summary for a delivery |
| GET | `/api/label-checks/:id` | Get label check by ID |
| POST | `/api/label-checks` | Start label check for a delivery |
| DELETE | `/api/label-checks/:id` | Delete label check (soft delete) |
| GET | `/api/label-checks/:id/export` | Export label check results to Excel |
| **Attendance** | | |
| GET | `/api/attendance/monthly` | Pobierz dane miesięczne |
| PUT | `/api/attendance/day` | Aktualizuj pojedynczy dzień |
| GET | `/api/attendance/export` | Eksport do Excel/PDF |
| **Logistics** | | |
| POST | `/api/logistics/parse` | Parsuje tekst maila i zwraca ustrukturyzowane dane (bez zapisu) |
| POST | `/api/logistics/mail-lists` | Zapisuje sparsowaną listę mailową do bazy |
| GET | `/api/logistics/mail-lists` | Pobiera listę wszystkich list mailowych z filtrami |
| GET | `/api/logistics/mail-lists/:id` | Pobiera szczegóły listy mailowej po ID |
| DELETE | `/api/logistics/mail-lists/:id` | Soft delete listy mailowej |
| GET | `/api/logistics/deliveries/:code/versions` | Pobiera wszystkie wersje dla danego kodu dostawy |
| GET | `/api/logistics/deliveries/:code/latest` | Pobiera najnowszą wersję dla danego kodu dostawy |
| GET | `/api/logistics/deliveries/:code/diff` | Porównuje dwie wersje listy dla danego kodu dostawy |
| GET | `/api/logistics/calendar` | Pobiera kalendarz dostaw (pogrupowane po datach) |
| PATCH | `/api/logistics/items/:id` | Aktualizuje pozycję mailową (np. ręczne przypisanie Order) |
| DELETE | `/api/logistics/items/:id/remove` | Usuwa pozycję z dostawy (soft delete) |
| POST | `/api/logistics/items/:id/confirm` | Potwierdza dodaną pozycję |
| DELETE | `/api/logistics/items/:id/reject` | Odrzuca dodaną pozycję (soft delete) |
| POST | `/api/logistics/items/:id/accept-change` | Akceptuje zmianę pozycji |
| POST | `/api/logistics/items/:id/restore` | Przywraca poprzednią wartość pozycji |
| POST | `/api/logistics/set-order-delivery-date` | Body: { orderId: number, deliveryCode: string (np. "08.01.2026_II") } |
| GET | `/api/logistics/deliveries/:code/orphan-orders` | Pobiera zlecenia przypisane do dostawy ale nieobecne na liście mailowej |
| DELETE | `/api/logistics/orders/:id/remove-from-delivery` | Usuwa zlecenie z dostawy (czyści datę dostawy) |
| **Pvc Warehouse** | | |
| GET | `/api/pvc-warehouse` | Pobiera stan magazynowy profili z filtrami |
| GET | `/api/pvc-warehouse/demand` | Pobiera zapotrzebowanie na profile (z OrderRequirement) |
| GET | `/api/pvc-warehouse/rw` | Pobiera RW (zużycie wewnętrzne) - profile ze zleceń ukończonych w danym miesiącu |
| GET | `/api/pvc-warehouse/colors` | Pobiera wszystkie kolory (dla sidebara) |
| GET | `/api/pvc-warehouse/systems` | Pobiera statystyki systemów (ile profili w każdym) |
| GET | `/api/pvc-warehouse/orders` | Źródło: SchucoOrderItem.deliveryDate |
| GET | `/api/pvc-warehouse/remanent/:colorId` | Gdy brak - używa aktualnego stanu (currentStockBeams z bazy, czyli stan na dziś) |
| **Help** | | |
| GET | `/api/help/pdf/:pageId` | Generuje i zwraca PDF z instrukcją obsługi dla danej strony |
| **Gmail** | | |
| GET | `/api/gmail/status` | Pobierz status schedulera, konfigurację i statystyki |
| POST | `/api/gmail/fetch` | Ręcznie uruchom pobieranie maili z załącznikami CSV |
| GET | `/api/gmail/logs` | Pobierz historię pobranych maili z Gmail |
| POST | `/api/gmail/test-connection` | Przetestuj połączenie z kontem Gmail przez IMAP |
| **Health** | | |
| GET | `/api/health/detailed` | Szczegółowy health check wszystkich systemów (tylko ADMIN) |
| **Inline (index.ts)** | | |
| GET | `/api/ready` | Readiness check including database connectivity |

---

## Detailed Endpoints

### Auth

**Route file:** `routes/auth.ts` | **Handler:** `handlers/authHandler.ts` | **Validator:** `validators/auth.ts`

#### POST /api/auth/login
- **Description:** Logowanie użytkownika

#### POST /api/auth/logout
- **Description:** Wylogowanie użytkownika (wymaga autoryzacji)

#### GET /api/auth/me
- **Description:** Pobierz dane aktualnie zalogowanego użytkownika

---

### Users

**Route file:** `routes/users.ts` | **Handler:** `handlers/usersHandler.ts` | **Validator:** `validators/auth.ts`

#### GET /api/users
- **Description:** Lista użytkowników

#### GET /api/users/:id
- **Description:** Pobierz użytkownika

#### POST /api/users
- **Description:** Stwórz użytkownika

#### PUT /api/users/:id
- **Description:** Zaktualizuj użytkownika

#### DELETE /api/users/:id
- **Description:** Usuń użytkownika

---

### Profiles

**Route file:** `routes/profiles.ts` | **Handler:** `handlers/profilesHandler.ts` | **Validator:** `validators/profile.ts`

#### GET /api/profiles
- **Description:** Get all aluminum profiles
- **Tags:** profiles

#### GET /api/profiles/:id
- **Description:** Get profile by ID
- **Tags:** profiles

#### POST /api/profiles
- **Description:** Create a new profile
- **Tags:** profiles

#### PUT /api/profiles/:id
- **Description:** Update an existing profile
- **Tags:** profiles

#### DELETE /api/profiles/:id
- **Description:** Delete a profile
- **Tags:** profiles

#### PATCH /api/profiles/update-orders
- **Description:** Update profile display orders
- **Tags:** profiles

---

### Colors

**Route file:** `routes/colors.ts` | **Handler:** `handlers/colorsHandler.ts` | **Validator:** `validators/color.ts`

#### GET /api/colors
- **Description:** List colors

#### GET /api/colors/:id
- **Description:** Get by ID

#### POST /api/colors
- **Description:** Create colors

#### PUT /api/colors/:id
- **Description:** Update by ID

#### DELETE /api/colors/:id
- **Description:** Delete by ID

#### PUT /api/colors/:colorId/profiles/:profileId/visibility
- **Description:** Profiles Visibility

---

### Private Colors

**Route file:** `routes/private-colors.ts` | **Handler:** `handlers/privateColorsHandler.ts` | **Validator:** `validators/color.ts`

#### GET /api/private-colors
- **Description:** Pobiera listę wszystkich kolorów prywatnych

#### PUT /api/private-colors/:id
- **Description:** Aktualizuje nazwę koloru prywatnego

#### DELETE /api/private-colors/:id
- **Description:** Usuwa kolor prywatny (tylko jeśli nie jest używany)

---

### Orders

**Route file:** `routes/orders.ts` | **Handler:** `handlers/ordersHandler.ts` | **Validator:** `validators/order.ts`

#### GET /api/orders
- **Description:** List orders

#### GET /api/orders/search
- **Description:** Search orders - optimized for GlobalSearch
- **Tags:** orders

#### GET /api/orders/completeness-stats
- **Description:** Get completeness statistics for operator dashboard
- **Tags:** orders

#### GET /api/orders/:id
- **Description:** Get by ID

#### GET /api/orders/by-number/:orderNumber
- **Description:** Get by number

#### POST /api/orders
- **Description:** Create orders

#### PUT /api/orders/:id
- **Description:** Update by ID

#### DELETE /api/orders/:id
- **Description:** Delete by ID

#### POST /api/orders/:id/archive
- **Description:** Archive

#### POST /api/orders/:id/unarchive
- **Description:** Unarchive

#### PATCH /api/orders/:id/manual-status
- **Description:** Update manual status of an order (do_not_cut, cancelled, on_hold, or null to clear)
- **Tags:** orders

#### PATCH /api/orders/:id/special-type
- **Description:** Update special type of an order (drzwi, psk, hs, ksztalt, or null to clear)
- **Tags:** orders

#### POST /api/orders/bulk-update-status
- **Description:** Bulk Update Status

#### POST /api/orders/revert-production
- **Description:** Cofnij produkcję (completed -> in_progress)

#### GET /api/orders/for-production
- **Description:** Get for production

#### GET /api/orders/monthly-production
- **Description:** Get orders completed in a specific month/year for production reports
- **Tags:** orders

#### PATCH /api/orders/:id
- **Description:** partial update

#### GET /api/orders/:id/has-pdf
- **Description:** check if PDF exists for order

#### GET /api/orders/:id/pdf
- **Description:** download PDF file for order

#### GET /api/orders/:id/has-glass-order-txt
- **Description:** Check if glass order TXT file exists for this order
- **Tags:** orders

#### GET /api/orders/:id/glass-order-txt
- **Description:** Download glass order TXT file for this order
- **Tags:** orders

#### GET /api/orders/table/:colorId
- **Description:** orders table for given color

#### GET /api/orders/requirements/totals
- **Description:** get totals for each profile

#### GET /api/orders/:id/readiness
- **Description:** Get production readiness checklist for an order (System Brain)
- **Tags:** orders, readiness

#### PATCH /api/orders/:id/variant-type
- **Description:** Set variant type for an order (correction or additional_file)
- **Tags:** orders

#### GET /api/orders/archive/years
- **Description:** Get available years in archive with order counts
- **Tags:** orders, archive

#### GET /api/orders/archive/:year
- **Description:** Get archived orders for a specific year (by completedAt year)
- **Tags:** orders, archive

#### POST /api/orders/archive/trigger
- **Description:** Manually trigger archive process (archives orders completed X days ago)
- **Tags:** orders, archive

#### GET /api/orders/archive/settings
- **Description:** Get archive settings (archiveAfterDays)
- **Tags:** orders, archive

---

### Warehouse

**Route file:** `routes/warehouse.ts` | **Handler:** `handlers/warehouseHandler.ts` | **Validator:** `validators/warehouse.ts`

#### GET /api/warehouse/shortages
- **Description:** All material shortages

#### GET /api/warehouse/history
- **Description:** All warehouse history

#### GET /api/warehouse/:colorId
- **Description:** Warehouse table for color

#### GET /api/warehouse/:colorId/average
- **Description:** Monthly average usage

#### GET /api/warehouse/history/:colorId
- **Description:** History for specific color

#### PUT /api/warehouse/:colorId/:profileId
- **Description:** Update stock

#### POST /api/warehouse/monthly-update
- **Description:** Monthly inventory update

#### POST /api/warehouse/rollback-inventory
- **Description:** Rollback last inventory

#### POST /api/warehouse/finalize-month
- **Description:** Finalize month (archive orders)

---

### Warehouse Orders

**Route file:** `routes/warehouse-orders.ts` | **Handler:** `handlers/warehouseOrdersHandler.ts` | **Validator:** `validators/warehouse-orders.ts`

#### GET /api/warehouse-orders
- **Description:** pobierz wszystkie zamówienia (z filtrowaniem)

#### GET /api/warehouse-orders/:id
- **Description:** pobierz jedno zamówienie

#### POST /api/warehouse-orders
- **Description:** utwórz nowe zamówienie

#### PUT /api/warehouse-orders/:id
- **Description:** aktualizuj zamówienie

#### DELETE /api/warehouse-orders/:id
- **Description:** usuń zamówienie

---

### Deliveries

**Route file:** `routes/deliveries.ts` | **Handler:** `handlers/deliveriesHandler.ts` | **Validator:** `validators/delivery.ts`

#### POST /api/deliveries/validate-orders
- **Description:** walidacja listy numerów zleceń

#### POST /api/deliveries/bulk-assign
- **Description:** masowe przypisanie zleceń

#### GET /api/deliveries/for-date
- **Description:** lista dostaw na datę

#### GET /api/deliveries/preview-number
- **Description:** podgląd numeru następnej dostawy

#### GET /api/deliveries/readiness/batch
- **Description:** Get aggregated readiness status for multiple deliveries
- **Tags:** deliveries, readiness

#### GET /api/deliveries
- **Description:** List deliveries

#### GET /api/deliveries/calendar
- **Description:** Get calendar

#### GET /api/deliveries/calendar-batch
- **Description:** Batch calendar endpoint - combines deliveries, working days, and holidays

#### GET /api/deliveries/profile-requirements
- **Description:** Get profile requirements

#### GET /api/deliveries/stats/windows/by-weekday
- **Description:** Stats Windows By Weekday

#### GET /api/deliveries/stats/windows
- **Description:** Stats Windows

#### GET /api/deliveries/stats/profiles
- **Description:** Stats Profiles

#### GET /api/deliveries/:id
- **Description:** Get by ID

#### POST /api/deliveries
- **Description:** Create deliveries

#### PUT /api/deliveries/:id
- **Description:** Update by ID

#### DELETE /api/deliveries/:id
- **Description:** Delete by ID

#### POST /api/deliveries/:id/orders
- **Description:** Orders

#### DELETE /api/deliveries/:id/orders/:orderId
- **Description:** Delete orders

#### PUT /api/deliveries/:id/orders/reorder
- **Description:** Orders Reorder

#### POST /api/deliveries/:id/move-order
- **Description:** Move Order

#### POST /api/deliveries/:id/items
- **Description:** Items

#### DELETE /api/deliveries/:id/items/:itemId
- **Description:** Delete items

#### POST /api/deliveries/:id/complete
- **Description:** Complete

#### POST /api/deliveries/:id/complete-all-orders
- **Description:** Complete All Orders

#### GET /api/deliveries/:id/protocol
- **Description:** Get protocol

#### GET /api/deliveries/:id/protocol/pdf
- **Description:** Protocol Pdf

#### PATCH /api/deliveries/bulk-update-dates
- **Description:** Bulk operations

#### GET /api/deliveries/:id/readiness
- **Description:** Get aggregated readiness status for a delivery
- **Tags:** deliveries, readiness

#### GET /api/deliveries/:id/label-check
- **Description:** Get latest label check for a delivery
- **Tags:** deliveries, label-checks

---

### Settings

**Route file:** `routes/settings.ts` | **Handler:** `handlers/settingsHandler.ts` | **Validator:** `validators/settings.ts`

#### GET /api/settings
- **Description:** List settings

#### PUT /api/settings
- **Description:** PUT settings

#### GET /api/settings/pallet-types
- **Description:** Get pallet types

#### POST /api/settings/pallet-types
- **Description:** Pallet Types

#### PUT /api/settings/pallet-types/:id
- **Description:** Update pallet types

#### DELETE /api/settings/pallet-types/:id
- **Description:** Delete pallet types

#### GET /api/settings/packing-rules
- **Description:** Get packing rules

#### POST /api/settings/packing-rules
- **Description:** Packing Rules

#### PUT /api/settings/packing-rules/:id
- **Description:** Update packing rules

#### DELETE /api/settings/packing-rules/:id
- **Description:** Delete packing rules

#### GET /api/settings/user-folder-path
- **Description:** User Folder Settings routes (wymaga auth - handler potrzebuje userId)

#### PUT /api/settings/user-folder-path
- **Description:** Update user folder path

#### GET /api/settings/document-author-mappings
- **Description:** Document Author Mappings routes

#### POST /api/settings/document-author-mappings
- **Description:** Document Author Mappings

#### PUT /api/settings/document-author-mappings/:id
- **Description:** Update document author mappings

#### DELETE /api/settings/document-author-mappings/:id
- **Description:** Delete document author mappings

#### GET /api/settings/browse-folders
- **Description:** przeglądaj foldery Windows

#### POST /api/settings/validate-folder
- **Description:** sprawdź czy folder istnieje

#### GET /api/settings/file-watcher/status
- **Description:** status i sciezki file watchera

#### POST /api/settings/file-watcher/restart
- **Description:** restartuj file watcher

#### POST /api/settings/document-author-mappings/backfill
- **Description:** zaktualizuj istniejące zlecenia

#### GET /api/settings/soft-delete-cleanup/status
- **Description:** status schedulera i statystyki

#### GET /api/settings/soft-delete-cleanup/dry-run
- **Description:** podglad co zostanie usuniete

#### POST /api/settings/soft-delete-cleanup/run
- **Description:** reczne uruchomienie cleanup

#### GET /api/settings/:key
- **Description:** /document-author-mappings, /browse-folders itd.

#### PUT /api/settings/:key
- **Description:** Update by ID

---

### Imports

**Route file:** `routes/imports.ts` | **Handler:** `handlers/importsHandler.ts` | **Validator:** `validators/import.ts`

#### POST /api/imports/upload
- **Description:** Upload

#### GET /api/imports
- **Description:** List imports

#### GET /api/imports/pending
- **Description:** Get pending

#### GET /api/imports/list-folders
- **Description:** Folder operations

#### GET /api/imports/scan-folder
- **Description:** Get scan folder

#### POST /api/imports/folder
- **Description:** Folder

#### POST /api/imports/archive-folder
- **Description:** Archive Folder

#### DELETE /api/imports/delete-folder
- **Description:** Delete delete folder

#### GET /api/imports/preview
- **Description:** Preview and process by filepath (with variant conflict detection)

#### POST /api/imports/process
- **Description:** Process

#### POST /api/imports/bulk
- **Description:** Bulk operations

#### GET /api/imports/:id
- **Description:** Single import operations

#### GET /api/imports/:id/preview
- **Description:** Get preview

#### POST /api/imports/:id/approve
- **Description:** Approve

#### POST /api/imports/:id/reject
- **Description:** Reject

#### DELETE /api/imports/:id
- **Description:** Delete by ID

#### GET /api/imports/queue/status
- **Description:** Import queue status (for monitoring)

#### POST /api/imports/queue/pause
- **Description:** Pause queue

#### POST /api/imports/queue/resume
- **Description:** Resume queue

#### DELETE /api/imports/queue/clear
- **Description:** Clear queue

---

### Dashboard

**Route file:** `routes/dashboard.ts` | **Handler:** `handlers/dashboardHandler.ts` | **Validator:** `validators/dashboard.ts`

#### GET /api/dashboard
- **Description:** Main dashboard data

#### GET /api/dashboard/alerts
- **Description:** Dashboard alerts

#### GET /api/dashboard/stats/weekly
- **Description:** Weekly statistics (8 weeks)

#### GET /api/dashboard/stats/monthly
- **Description:** Monthly statistics

#### GET /api/dashboard/operator
- **Description:** Get operator dashboard with completeness statistics
- **Tags:** dashboard

---

### Working Days

**Route file:** `routes/working-days.ts` | **Handler:** `handlers/workingDaysHandler.ts` | **Validator:** `validators/common.ts`

#### GET /api/working-days
- **Description:** pobierz dni wolne dla zakresu dat

#### GET /api/working-days/holidays
- **Description:** pobierz święta dla roku

#### POST /api/working-days
- **Description:** ustaw dzień jako wolny/pracujący

#### DELETE /api/working-days/:date
- **Description:** usuń oznaczenie (przywróć domyślny stan)

---

### Schuco

**Route file:** `routes/schuco.ts` | **Handler:** `handlers/schucoHandler.ts` | **Validator:** `validators/schuco.ts`

#### GET /api/schuco/deliveries
- **Description:** Get Schuco deliveries with pagination
- **Tags:** schuco

#### POST /api/schuco/refresh
- **Description:** Trigger manual refresh of Schuco deliveries
- **Tags:** schuco

#### GET /api/schuco/status
- **Description:** Get status of last Schuco fetch
- **Tags:** schuco

#### GET /api/schuco/logs
- **Description:** Get history of Schuco fetches
- **Tags:** schuco

#### GET /api/schuco/statistics
- **Description:** Get statistics about deliveries by changeType
- **Tags:** schuco

#### GET /api/schuco/debug/changed
- **Description:** DEBUG: Get changed records count

#### POST /api/schuco/sync-links
- **Description:** Synchronize all Schuco deliveries with orders (creates missing links)
- **Tags:** schuco

#### GET /api/schuco/unlinked
- **Description:** Get Schuco deliveries without order links
- **Tags:** schuco

#### POST /api/schuco/links
- **Description:** Create manual link between order and Schuco delivery
- **Tags:** schuco

#### DELETE /api/schuco/links/:id
- **Description:** Delete link between order and Schuco delivery
- **Tags:** schuco

#### GET /api/schuco/by-week
- **Description:** Get Schuco deliveries grouped by delivery week
- **Tags:** schuco

#### POST /api/schuco/cleanup-pending
- **Description:** Clean up stale pending logs (older than 10 minutes)
- **Tags:** schuco

#### POST /api/schuco/cancel
- **Description:** Cancel active Schuco import
- **Tags:** schuco

#### GET /api/schuco/is-running
- **Description:** Check if Schuco import is currently running
- **Tags:** schuco

#### GET /api/schuco/archive
- **Description:** Get archived Schuco deliveries with pagination
- **Tags:** schuco

#### GET /api/schuco/archive/stats
- **Description:** Get statistics about archived deliveries
- **Tags:** schuco

#### POST /api/schuco/archive/run
- **Description:** Manually trigger archiving of old completed deliveries
- **Tags:** schuco

#### GET /api/schuco/settings/filter-days
- **Description:** Get the number of days for Schuco date filter
- **Tags:** schuco

#### PUT /api/schuco/settings/filter-days
- **Description:** Update the number of days for Schuco date filter
- **Tags:** schuco

#### GET /api/schuco/settings/filter-date
- **Description:** Get the specific date for Schuco date filter
- **Tags:** schuco

#### PUT /api/schuco/settings/filter-date
- **Description:** Update the specific date for Schuco date filter (format: YYYY-MM-DD)
- **Tags:** schuco

#### DELETE /api/schuco/settings/filter-date
- **Description:** Clear the specific filter date (will use filter-days instead)
- **Tags:** schuco

#### GET /api/schuco/items/stats
- **Description:** Get statistics about order items
- **Tags:** schuco

#### GET /api/schuco/items/is-running
- **Description:** Check if order items fetch is currently running
- **Tags:** schuco

#### POST /api/schuco/items/fetch
- **Description:** Trigger manual fetch of order items from Schuco. Mode: missing (default), all, from-date
- **Tags:** schuco

#### POST /api/schuco/items/clear-old-changes
- **Description:** Clear change markers older than 72 hours
- **Tags:** schuco

#### POST /api/schuco/items/refresh
- **Description:** Refresh stale order items (items fetched more than X days ago)
- **Tags:** schuco

#### GET /api/schuco/items/scheduler-status
- **Description:** Get status of automatic item fetch scheduler
- **Tags:** schuco

#### POST /api/schuco/items/scheduler/start
- **Description:** Start automatic item fetch scheduler (every 45 minutes)
- **Tags:** schuco

#### POST /api/schuco/items/scheduler/stop
- **Description:** Stop automatic item fetch scheduler
- **Tags:** schuco

#### POST /api/schuco/items/auto-fetch
- **Description:** Manually trigger auto-fetch for changed items (one-time)
- **Tags:** schuco

#### GET /api/schuco/items/stale-count
- **Description:** Get count of deliveries with stale items
- **Tags:** schuco

#### GET /api/schuco/items/:deliveryId
- **Description:** Get order items for a specific Schuco delivery
- **Tags:** schuco

---

### Pallets

**Route file:** `routes/pallets.ts` | **Handler:** `handlers/palletsHandler.ts` | **Validator:** `validators/pallet.ts`

#### POST /api/pallets/optimize/:deliveryId
- **Description:** Uruchom optymalizację pakowania dla dostawy

#### GET /api/pallets/optimization/:deliveryId
- **Description:** Pobierz zapisaną optymalizację

#### DELETE /api/pallets/optimization/:deliveryId
- **Description:** Usuń optymalizację

#### GET /api/pallets/export/:deliveryId
- **Description:** Eksportuj optymalizację do PDF

#### GET /api/pallets/types
- **Description:** Pobierz wszystkie typy palet

#### POST /api/pallets/types
- **Description:** Utwórz nowy typ palety

#### PATCH /api/pallets/types/:id
- **Description:** Zaktualizuj typ palety

#### DELETE /api/pallets/types/:id
- **Description:** Usuń typ palety

#### GET /api/pallets/rules
- **Description:** Pobierz reguły pakowania

#### POST /api/pallets/rules
- **Description:** Utwórz nową regułę pakowania

#### PATCH /api/pallets/rules/:id
- **Description:** Zaktualizuj regułę pakowania

#### DELETE /api/pallets/rules/:id
- **Description:** Usuń regułę pakowania

---

### Currency Config

**Route file:** `routes/currency-config.ts` | **Handler:** `handlers/currencyConfigHandler.ts` | **Validator:** `validators/currencyConfig.ts`

#### GET /api/currency-config/current
- **Description:** Get current EUR to PLN exchange rate
- **Tags:** currency

#### GET /api/currency-config/history
- **Description:** Get exchange rate history
- **Tags:** currency

#### POST /api/currency-config
- **Description:** Update EUR to PLN exchange rate
- **Tags:** currency

#### POST /api/currency-config/convert/eur-to-pln
- **Description:** Convert EUR amount to PLN using current rate
- **Tags:** currency

#### POST /api/currency-config/convert/pln-to-eur
- **Description:** Convert PLN amount to EUR using current rate
- **Tags:** currency

---

### Monthly Reports

**Route file:** `routes/monthly-reports.ts` | **Handler:** `handlers/monthlyReportsHandler.ts` | **Validator:** `validators/common.ts`

#### GET /api/monthly-reports
- **Description:** Get all monthly reports
- **Tags:** monthly-reports

#### GET /api/monthly-reports/:year/:month
- **Description:** Get monthly report for specific year and month
- **Tags:** monthly-reports

#### POST /api/monthly-reports/:year/:month/generate
- **Description:** Generate monthly report for specific year and month
- **Tags:** monthly-reports

#### GET /api/monthly-reports/:year/:month/export/excel
- **Description:** Export monthly report to Excel
- **Tags:** monthly-reports

#### GET /api/monthly-reports/:year/:month/export/pdf
- **Description:** Export monthly report to PDF
- **Tags:** monthly-reports

#### DELETE /api/monthly-reports/:year/:month
- **Description:** Delete monthly report
- **Tags:** monthly-reports

---

### Profile Depths

**Route file:** `routes/profileDepths.ts` | **Handler:** `handlers/profileDepthsHandler.ts` | **Validator:** `validators/profileDepth.ts`

#### GET /api/profile-depths
- **Description:** Get all profile depths

#### GET /api/profile-depths/:id
- **Description:** Get profile depth by ID

#### POST /api/profile-depths
- **Description:** Create new profile depth

#### PATCH /api/profile-depths/:id
- **Description:** Update profile depth

#### DELETE /api/profile-depths/:id
- **Description:** Delete profile depth

---

### Profile Pallet Configs

**Route file:** `routes/profilePalletConfig.ts` | **Handler:** `handlers/profilePalletConfigsHandler.ts` | **Validator:** `validators/profilePalletConfig.ts`

#### GET /api/profile-pallet-configs
- **Description:** Pobierz wszystkie przeliczniki

#### GET /api/profile-pallet-configs/:id
- **Description:** Pobierz przelicznik po ID

#### POST /api/profile-pallet-configs
- **Description:** Dodaj nowy przelicznik

#### PATCH /api/profile-pallet-configs/:id
- **Description:** Edytuj przelicznik

#### DELETE /api/profile-pallet-configs/:id
- **Description:** Usuń przelicznik

---

### Glass Orders

**Route file:** `routes/glass-orders.ts` | **Handler:** `handlers/glassOrdersHandler.ts` | **Validator:** `validators/glass.ts`

#### GET /api/glass-orders
- **Description:** Glass order endpoints (no authentication required in development)

#### GET /api/glass-orders/:id
- **Description:** Get by ID

#### POST /api/glass-orders/import
- **Description:** Import endpoint (debug logging moved to handler)

#### POST /api/glass-orders/rematch
- **Description:** Re-match all glass orders to production orders (recalculate orderedGlassCount)

#### DELETE /api/glass-orders/:id
- **Description:** Delete by ID

#### GET /api/glass-orders/:id/summary
- **Description:** Get summary

#### GET /api/glass-orders/:id/validations
- **Description:** Get validations

#### PATCH /api/glass-orders/:id/status
- **Description:** Update status

---

### Glass Deliveries

**Route file:** `routes/glass-deliveries.ts` | **Handler:** `handlers/glassDeliveriesHandler.ts` | **Validator:** `validators/glass.ts`

#### GET /api/glass-deliveries/latest-import/summary
- **Description:** Glass delivery endpoints (no authentication required in development)

#### GET /api/glass-deliveries
- **Description:** List glass deliveries

#### GET /api/glass-deliveries/:id
- **Description:** Get by ID

#### POST /api/glass-deliveries/import
- **Description:** Import

#### DELETE /api/glass-deliveries/:id
- **Description:** Delete by ID

#### GET /api/glass-deliveries/categorized/loose
- **Description:** Kategoryzowane szyby

#### GET /api/glass-deliveries/categorized/aluminum
- **Description:** Categorized Aluminum

#### GET /api/glass-deliveries/categorized/aluminum/summary
- **Description:** Categorized Aluminum Summary

#### GET /api/glass-deliveries/categorized/reclamation
- **Description:** Categorized Reclamation

---

### Glass Validations

**Route file:** `routes/glass-validations.ts` | **Handler:** `handlers/glassValidationsHandler.ts` | **Validator:** `validators/glass.ts`

#### GET /api/glass-validations/dashboard
- **Description:** Get glass validation dashboard with statistics
- **Tags:** glass-validations

#### GET /api/glass-validations/order/:orderNumber
- **Description:** Get validations for a specific order
- **Tags:** glass-validations

#### GET /api/glass-validations/order/:orderNumber/details
- **Description:** Get detailed glass discrepancies for an order - comparison per dimension with delivery info
- **Tags:** glass-validations

#### GET /api/glass-validations
- **Description:** Get all glass validations with optional filters
- **Tags:** glass-validations

#### POST /api/glass-validations/:id/resolve
- **Description:** Resolve a glass validation issue
- **Tags:** glass-validations

---

### Cleanup Pending Prices

**Route file:** `routes/pending-order-price-cleanup.ts` | **Handler:** `handlers/cleanupHandler.ts`

#### GET /api/cleanup/pending-prices/statistics
- **Description:** Get cleanup statistics for pending order prices
- **Tags:** cleanup

#### GET /api/cleanup/pending-prices/config
- **Description:** Get cleanup configuration
- **Tags:** cleanup

#### GET /api/cleanup/pending-prices/scheduler/status
- **Description:** Get cleanup scheduler status
- **Tags:** cleanup

#### POST /api/cleanup/pending-prices/run
- **Description:** Manually trigger cleanup process
- **Tags:** cleanup

#### GET /api/cleanup/pending-prices/prices
- **Description:** Get all pending order prices (optionally filtered by status)
- **Tags:** cleanup

#### POST /api/cleanup/pending-prices/rematch
- **Description:** Re-match all pending prices to existing orders
- **Tags:** cleanup

#### POST /api/cleanup/pending-prices/reimport
- **Description:** Force reimport specific PDF files, create pending prices, and run rematch
- **Tags:** cleanup

---

### Okuc

**Route file:** `routes/okuc.ts` | **Handler:** `handlers/okucHandler.ts` | **Validator:** `validators/okuc.ts`

#### GET /api/okuc/health
- **Description:** Health check for the module

#### GET /api/okuc/articles
- **Description:** List all articles with optional filters
- **Tags:** okuc-articles

#### GET /api/okuc/articles/pending-review
- **Description:** List all articles awaiting orderClass verification
- **Tags:** okuc-articles

#### POST /api/okuc/articles/batch-update-order-class
- **Description:** Update orderClass for multiple articles at once
- **Tags:** okuc-articles

#### GET /api/okuc/articles/:id
- **Description:** Get article by ID
- **Tags:** okuc-articles

#### GET /api/okuc/articles/by-article-id/:articleId
- **Description:** Get article by articleId
- **Tags:** okuc-articles

#### POST /api/okuc/articles
- **Description:** Create a new article
- **Tags:** okuc-articles

#### PATCH /api/okuc/articles/:id
- **Description:** Update an article
- **Tags:** okuc-articles

#### DELETE /api/okuc/articles/:id
- **Description:** Delete an article
- **Tags:** okuc-articles

#### POST /api/okuc/articles/:id/aliases
- **Description:** Add an alias to an article
- **Tags:** okuc-articles

#### GET /api/okuc/articles/:id/aliases
- **Description:** Get all aliases for an article
- **Tags:** okuc-articles

#### POST /api/okuc/articles/import/preview
- **Description:** Preview CSV import - detect conflicts before importing
- **Tags:** okuc-articles

#### POST /api/okuc/articles/import
- **Description:** Import articles from CSV file with conflict resolution
- **Tags:** okuc-articles

#### GET /api/okuc/articles/export
- **Description:** Export articles to CSV file
- **Tags:** okuc-articles

#### GET /api/okuc/stock
- **Description:** List all stock with optional filters
- **Tags:** okuc-stock

#### GET /api/okuc/stock/summary
- **Description:** Get stock summary grouped by warehouse
- **Tags:** okuc-stock

#### POST /api/okuc/stock/import/preview
- **Description:** Preview stock import from CSV file
- **Tags:** okuc-stock

#### POST /api/okuc/stock/import
- **Description:** Import stock with conflict resolution
- **Tags:** okuc-stock

#### GET /api/okuc/stock/export
- **Description:** Export stock to CSV
- **Tags:** okuc-stock

#### GET /api/okuc/stock/below-minimum
- **Description:** Get stock items below minimum level
- **Tags:** okuc-stock

#### GET /api/okuc/stock/:id
- **Description:** Get stock by ID
- **Tags:** okuc-stock

#### GET /api/okuc/stock/by-article/:articleId
- **Description:** Get stock by article ID and warehouse type
- **Tags:** okuc-stock

#### PATCH /api/okuc/stock/:id
- **Description:** Update stock quantity
- **Tags:** okuc-stock

#### POST /api/okuc/stock/adjust
- **Description:** Adjust stock quantity
- **Tags:** okuc-stock

#### GET /api/okuc/stock/history/:articleId
- **Description:** Get stock history for an article
- **Tags:** okuc-stock

#### GET /api/okuc/demand
- **Description:** List all demands with optional filters
- **Tags:** okuc-demand

#### GET /api/okuc/demand/summary
- **Description:** Get demand summary grouped by week
- **Tags:** okuc-demand

#### GET /api/okuc/demand/:id
- **Description:** Get demand by ID
- **Tags:** okuc-demand

#### POST /api/okuc/demand
- **Description:** Create a new demand
- **Tags:** okuc-demand

#### PUT /api/okuc/demand/:id
- **Description:** Update existing demand
- **Tags:** okuc-demand

#### DELETE /api/okuc/demand/:id
- **Description:** Delete demand
- **Tags:** okuc-demand

#### GET /api/okuc/orders
- **Description:** List all orders with optional filters
- **Tags:** okuc-orders

#### GET /api/okuc/orders/stats
- **Description:** Get order statistics
- **Tags:** okuc-orders

#### GET /api/okuc/orders/:id
- **Description:** Get order by ID
- **Tags:** okuc-orders

#### POST /api/okuc/orders
- **Description:** Create a new order
- **Tags:** okuc-orders

#### PUT /api/okuc/orders/:id
- **Description:** Update existing order
- **Tags:** okuc-orders

#### POST /api/okuc/orders/:id/receive
- **Description:** Mark order as received and update received quantities
- **Tags:** okuc-orders

#### DELETE /api/okuc/orders/:id
- **Description:** Delete order (only if draft)
- **Tags:** okuc-orders

#### POST /api/okuc/orders/import/parse
- **Description:** Parsuje plik XLSX i zwraca podgląd danych do zatwierdzenia
- **Tags:** okuc-orders

#### POST /api/okuc/orders/import/confirm
- **Description:** Zatwierdza import i tworzy zamówienie
- **Tags:** okuc-orders

#### GET /api/okuc/proportions
- **Description:** List all proportions with optional filters

#### GET /api/okuc/proportions/chains/:sourceArticleId
- **Description:** Get proportion chains starting from source article

#### GET /api/okuc/proportions/article/:articleId
- **Description:** Get proportions by article (both as source and target)

#### GET /api/okuc/proportions/:id
- **Description:** Get proportion by ID

#### POST /api/okuc/proportions
- **Description:** Create new proportion

#### PUT /api/okuc/proportions/:id
- **Description:** Update proportion

#### POST /api/okuc/proportions/:id/deactivate
- **Description:** Deactivate proportion (soft delete)

#### POST /api/okuc/proportions/:id/activate
- **Description:** Activate proportion

#### DELETE /api/okuc/proportions/:id
- **Description:** Delete proportion (hard delete)

#### GET /api/okuc/locations
- **Description:** List all active warehouse locations
- **Tags:** okuc-locations

#### POST /api/okuc/locations
- **Description:** Create a new warehouse location
- **Tags:** okuc-locations

#### POST /api/okuc/locations/reorder
- **Description:** Reorder warehouse locations
- **Tags:** okuc-locations

#### PATCH /api/okuc/locations/:id
- **Description:** Update a warehouse location
- **Tags:** okuc-locations

#### DELETE /api/okuc/locations/:id
- **Description:** Delete a warehouse location (soft delete)
- **Tags:** okuc-locations

#### GET /api/okuc/replacements
- **Description:** Pobierz listę wszystkich mapowań zastępstw artykułów
- **Tags:** okuc-replacements

#### POST /api/okuc/replacements
- **Description:** Ustaw lub zmień mapowanie zastępstwa artykułu
- **Tags:** okuc-replacements

#### DELETE /api/okuc/replacements/:id
- **Description:** Usuń mapowanie zastępstwa (cofnij wygaszanie artykułu)
- **Tags:** okuc-replacements

#### POST /api/okuc/replacements/:id/transfer
- **Description:** Ręcznie przenieś zapotrzebowanie z artykułu wygaszanego na zamiennik
- **Tags:** okuc-replacements

---

### Akrobud Verification

**Route file:** `routes/akrobud-verification.ts` | **Handler:** `handlers/akrobudVerificationHandler.ts` | **Validator:** `validators/akrobud-verification.ts`

#### GET /api/akrobud-verification
- **Description:** Pobierz wszystkie listy

#### POST /api/akrobud-verification/parse-mail
- **Description:** Parsuj treść maila (preview)

#### POST /api/akrobud-verification/preview-projects
- **Description:** Preview projektów

#### POST /api/akrobud-verification/versions
- **Description:** Utwórz nową wersję listy

#### GET /api/akrobud-verification/versions
- **Description:** Pobierz wersje dla daty

#### POST /api/akrobud-verification/compare-versions
- **Description:** Porównaj wersje

#### GET /api/akrobud-verification/:id
- **Description:** Pobierz listę po ID

#### GET /api/akrobud-verification/:id/versions
- **Description:** Historia wersji listy

#### POST /api/akrobud-verification/:id/verify-projects
- **Description:** Weryfikuj listę projektów

#### POST /api/akrobud-verification
- **Description:** Utwórz listę

#### PUT /api/akrobud-verification/:id
- **Description:** Aktualizuj listę

#### DELETE /api/akrobud-verification/:id
- **Description:** Usuń listę (soft delete)

#### POST /api/akrobud-verification/:id/items
- **Description:** Dodaj elementy do listy

#### POST /api/akrobud-verification/:id/items/parse
- **Description:** Parsuj tekst (preview)

#### DELETE /api/akrobud-verification/:id/items/:itemId
- **Description:** Usuń element

#### DELETE /api/akrobud-verification/:id/items
- **Description:** Wyczyść wszystkie elementy

#### POST /api/akrobud-verification/:id/verify
- **Description:** Weryfikuj listę

#### POST /api/akrobud-verification/:id/apply
- **Description:** Zastosuj zmiany

---

### Timesheets

**Route file:** `routes/timesheets.ts` | **Handler:** `handlers/timesheetsHandler.ts` | **Validator:** `validators/timesheets.ts`

#### GET /api/timesheets/workers
- **Description:** Lista pracowników

#### GET /api/timesheets/workers/:id
- **Description:** Szczegóły pracownika

#### POST /api/timesheets/workers
- **Description:** Dodaj pracownika

#### PUT /api/timesheets/workers/:id
- **Description:** Aktualizuj pracownika

#### DELETE /api/timesheets/workers/:id
- **Description:** Dezaktywuj pracownika (soft delete)

#### GET /api/timesheets/positions
- **Description:** Lista stanowisk

#### GET /api/timesheets/positions/:id
- **Description:** Szczegóły stanowiska

#### POST /api/timesheets/positions
- **Description:** Dodaj stanowisko

#### PUT /api/timesheets/positions/:id
- **Description:** Aktualizuj stanowisko

#### GET /api/timesheets/task-types
- **Description:** Lista typów zadań nieprodukcyjnych

#### GET /api/timesheets/task-types/:id
- **Description:** Szczegóły typu zadania

#### POST /api/timesheets/task-types
- **Description:** Dodaj typ zadania

#### PUT /api/timesheets/task-types/:id
- **Description:** Aktualizuj typ zadania

#### GET /api/timesheets/special-work-types
- **Description:** Lista typów nietypówek

#### GET /api/timesheets/special-work-types/:id
- **Description:** Szczegóły typu nietypówki

#### POST /api/timesheets/special-work-types
- **Description:** Dodaj typ nietypówki

#### PUT /api/timesheets/special-work-types/:id
- **Description:** Aktualizuj typ nietypówki

#### PATCH /api/timesheets/special-work-types/:id/toggle
- **Description:** Przełącz aktywność typu nietypówki

#### GET /api/timesheets/entries
- **Description:** Lista wpisów (z filtrowaniem po dacie/pracowniku)

#### GET /api/timesheets/entries/:id
- **Description:** Szczegóły wpisu

#### POST /api/timesheets/entries
- **Description:** Dodaj wpis

#### PUT /api/timesheets/entries/:id
- **Description:** Aktualizuj wpis

#### DELETE /api/timesheets/entries/:id
- **Description:** Usuń wpis

#### POST /api/timesheets/set-standard-day
- **Description:** Ustaw standardowy dzień dla wielu pracowników

#### POST /api/timesheets/set-absence-range
- **Description:** Ustaw nieobecność na zakres dat

#### GET /api/timesheets/calendar
- **Description:** Podsumowanie kalendarza na miesiąc

#### GET /api/timesheets/day-summary
- **Description:** Podsumowanie dnia

---

### Pallet Stock

**Route file:** `routes/pallet-stock.ts` | **Handler:** `handlers/palletStockHandler.ts` | **Validator:** `validators/pallet-stock.ts`

#### GET /api/pallet-stock/day/:date
- **Description:** Pobierz dane dnia paletowego

#### PUT /api/pallet-stock/day/:date
- **Description:** Aktualizuj wpisy dnia paletowego

#### POST /api/pallet-stock/day/:date/close
- **Description:** Zamknij dzien paletowy

#### POST /api/pallet-stock/day/:date/entries/:type/correct
- **Description:** Koryguj stan poczatkowy

#### GET /api/pallet-stock/month/:year/:month
- **Description:** Pobierz podsumowanie miesiaca

#### GET /api/pallet-stock/calendar/:year/:month
- **Description:** Pobierz kalendarz miesiaca

#### GET /api/pallet-stock/alerts/config
- **Description:** Pobierz konfiguracje alertow

#### PUT /api/pallet-stock/alerts/config
- **Description:** Aktualizuj konfiguracje alertow

#### GET /api/pallet-stock/initial
- **Description:** Pobierz stany początkowe

#### PUT /api/pallet-stock/initial
- **Description:** Ustaw stany początkowe (admin only)

---

### Production Reports

**Route file:** `routes/production-reports.ts` | **Handler:** `handlers/productionReportsHandler.ts` | **Validator:** `validators/production-reports.ts`

#### GET /api/production-reports/:year/:month/pdf
- **Description:** Eksport PDF raportu - wszyscy zalogowani (MUSI być przed /:year/:month)

#### GET /api/production-reports/:year/:month/summary
- **Description:** Pobierz podsumowania (MUSI być przed /:year/:month)

#### GET /api/production-reports/:year/:month/invoice-auto-fill-preview
- **Description:** Preview auto-fill FV - manager/admin/accountant (MUSI być przed /:year/:month)

#### POST /api/production-reports/:year/:month/invoice-auto-fill
- **Description:** Wykonaj auto-fill FV - manager/admin/accountant (MUSI być przed /:year/:month)

#### GET /api/production-reports/:year/:month
- **Description:** Pobierz raport dla miesiąca

#### PUT /api/production-reports/:year/:month/items/:orderId
- **Description:** Aktualizuj pozycję raportu (ilości, RW) - manager/admin

#### PUT /api/production-reports/:year/:month/items/:orderId/invoice
- **Description:** Aktualizuj dane FV - manager/admin/accountant

#### PATCH /api/production-reports/:year/:month/items/:orderId/verify
- **Description:** Oznacz zlecenie jako sprawdzone/niesprawdzone - manager/admin

#### PUT /api/production-reports/:year/:month/atypical
- **Description:** Aktualizuj nietypówki - manager/admin

#### POST /api/production-reports/:year/:month/close
- **Description:** Zamknij miesiąc - manager/admin

#### POST /api/production-reports/:year/:month/reopen
- **Description:** Odblokuj miesiąc - manager/admin

---

### Bug Reports

**Route file:** `routes/bug-reports.ts` | **Handler:** `handlers/bugReportsHandler.ts` | **Validator:** `validators/bugReport.ts`

#### POST /api/bug-reports
- **Description:** Zgłoś problem lub błąd w aplikacji
- **Tags:** bug-reports

#### GET /api/bug-reports
- **Description:** Pobierz ostatnie zgłoszenia błędów (tylko ADMIN)
- **Tags:** bug-reports

---

### Moja Praca

**Route file:** `routes/moja-praca.ts` | **Handler:** `handlers/mojaPracaHandler.ts` | **Validator:** `validators/moja-praca.ts`

#### GET /api/moja-praca/conflicts
- **Description:** Lista konfliktów użytkownika

#### GET /api/moja-praca/conflicts/count
- **Description:** Liczba konfliktów (dla badge w sidebar)

#### GET /api/moja-praca/conflicts/:id
- **Description:** Szczegóły konfliktu z danymi bazowego zlecenia

#### POST /api/moja-praca/conflicts/:id/resolve
- **Description:** Rozwiąż konflikt

#### POST /api/moja-praca/conflicts/bulk-resolve
- **Description:** Rozwiąż wiele konfliktów naraz

#### GET /api/moja-praca/orders
- **Description:** Zlecenia użytkownika na dany dzień

#### GET /api/moja-praca/deliveries
- **Description:** Dostawy zawierające zlecenia użytkownika

#### GET /api/moja-praca/glass-orders
- **Description:** Zamówienia szyb dla zleceń użytkownika

#### GET /api/moja-praca/summary
- **Description:** Podsumowanie dnia dla użytkownika

#### GET /api/moja-praca/alerts
- **Description:** Wszystkie alerty (zlecenia bez cen + problemy z etykietami)

#### GET /api/moja-praca/alerts/orders-without-price
- **Description:** Zlecenia Akrobud w produkcji bez cen

#### GET /api/moja-praca/alerts/label-issues
- **Description:** Dostawy z problemami etykiet

---

### Production Planning

**Route file:** `routes/production-planning.ts` | **Handler:** `handlers/productionPlanningHandler.ts` | **Validator:** `validators/productionPlanning.ts`

#### GET /api/production-planning/efficiency-configs
- **Description:** Get efficiency configs

#### GET /api/production-planning/efficiency-configs/:id
- **Description:** Get efficiency configs

#### POST /api/production-planning/efficiency-configs
- **Description:** Efficiency Configs

#### PUT /api/production-planning/efficiency-configs/:id
- **Description:** Update efficiency configs

#### DELETE /api/production-planning/efficiency-configs/:id
- **Description:** Delete efficiency configs

#### GET /api/production-planning/settings
- **Description:** Get settings

#### GET /api/production-planning/settings/:key
- **Description:** Get settings

#### POST /api/production-planning/settings
- **Description:** Settings

#### PUT /api/production-planning/settings/:key
- **Description:** Update settings

#### DELETE /api/production-planning/settings/:key
- **Description:** Delete settings

#### GET /api/production-planning/calendar
- **Description:** Get calendar

#### POST /api/production-planning/calendar
- **Description:** Calendar

#### DELETE /api/production-planning/calendar/:date
- **Description:** Delete calendar

#### GET /api/production-planning/profiles/palletized
- **Description:** Profiles Palletized

#### PATCH /api/production-planning/profiles/:id/palletized
- **Description:** Profiles Palletized

#### PATCH /api/production-planning/profiles/palletized/bulk
- **Description:** Profiles Palletized Bulk

#### GET /api/production-planning/colors/typical
- **Description:** Colors Typical

#### PATCH /api/production-planning/colors/:id/typical
- **Description:** Colors Typical

#### PATCH /api/production-planning/colors/typical/bulk
- **Description:** Colors Typical Bulk

---

### Steel

**Route file:** `routes/steel.ts` | **Handler:** `handlers/steelHandler.ts` | **Validator:** `validators/steel.ts`

#### GET /api/steel
- **Description:** lista wszystkich stali

#### GET /api/steel/with-stock
- **Description:** lista stali ze stanem magazynowym

#### GET /api/steel/:id
- **Description:** pojedyncza stal

#### POST /api/steel
- **Description:** dodaj nową stal

#### PUT /api/steel/:id
- **Description:** aktualizuj stal

#### DELETE /api/steel/:id
- **Description:** usuń stal

#### PATCH /api/steel/update-orders
- **Description:** zmień kolejność stali

#### GET /api/steel/history
- **Description:** historia zmian stanu magazynowego

#### GET /api/steel/:id/stock
- **Description:** pobierz stan magazynowy

#### PATCH /api/steel/:id/stock
- **Description:** aktualizuj stan magazynowy

---

### Label Checks

**Route file:** `routes/label-checks.ts` | **Handler:** `handlers/labelChecksHandler.ts` | **Validator:** `validators/label-check.ts`

#### GET /api/label-checks
- **Description:** Get all label checks with filters and pagination
- **Tags:** label-checks

#### GET /api/label-checks/statistics
- **Description:** Get label check statistics
- **Tags:** label-checks

#### GET /api/label-checks/delivery/:id
- **Description:** Get latest label check for a delivery
- **Tags:** label-checks

#### GET /api/label-checks/delivery/:id/summary
- **Description:** Get label check summary for a delivery
- **Tags:** label-checks

#### GET /api/label-checks/:id
- **Description:** Get label check by ID
- **Tags:** label-checks

#### POST /api/label-checks
- **Description:** Start label check for a delivery
- **Tags:** label-checks

#### DELETE /api/label-checks/:id
- **Description:** Delete label check (soft delete)
- **Tags:** label-checks

#### GET /api/label-checks/:id/export
- **Description:** Export label check results to Excel
- **Tags:** label-checks

---

### Attendance

**Route file:** `routes/attendance.ts` | **Handler:** `handlers/attendanceHandler.ts` | **Validator:** `validators/common.ts`

#### GET /api/attendance/monthly
- **Description:** Pobierz dane miesięczne

#### PUT /api/attendance/day
- **Description:** Aktualizuj pojedynczy dzień

#### GET /api/attendance/export
- **Description:** Eksport do Excel/PDF

---

### Logistics

**Route file:** `routes/logistics.ts` | **Handler:** `handlers/logisticsHandler.ts` | **Validator:** `validators/logistics.ts`

#### POST /api/logistics/parse
- **Description:** Parsuje tekst maila i zwraca ustrukturyzowane dane (bez zapisu)

#### POST /api/logistics/mail-lists
- **Description:** Zapisuje sparsowaną listę mailową do bazy

#### GET /api/logistics/mail-lists
- **Description:** Pobiera listę wszystkich list mailowych z filtrami

#### GET /api/logistics/mail-lists/:id
- **Description:** Pobiera szczegóły listy mailowej po ID

#### DELETE /api/logistics/mail-lists/:id
- **Description:** Soft delete listy mailowej

#### GET /api/logistics/deliveries/:code/versions
- **Description:** Pobiera wszystkie wersje dla danego kodu dostawy

#### GET /api/logistics/deliveries/:code/latest
- **Description:** Pobiera najnowszą wersję dla danego kodu dostawy

#### GET /api/logistics/deliveries/:code/diff
- **Description:** Porównuje dwie wersje listy dla danego kodu dostawy

#### GET /api/logistics/calendar
- **Description:** Pobiera kalendarz dostaw (pogrupowane po datach)

#### PATCH /api/logistics/items/:id
- **Description:** Aktualizuje pozycję mailową (np. ręczne przypisanie Order)

#### DELETE /api/logistics/items/:id/remove
- **Description:** Usuwa pozycję z dostawy (soft delete)

#### POST /api/logistics/items/:id/confirm
- **Description:** Potwierdza dodaną pozycję

#### DELETE /api/logistics/items/:id/reject
- **Description:** Odrzuca dodaną pozycję (soft delete)

#### POST /api/logistics/items/:id/accept-change
- **Description:** Akceptuje zmianę pozycji

#### POST /api/logistics/items/:id/restore
- **Description:** Przywraca poprzednią wartość pozycji

#### POST /api/logistics/set-order-delivery-date
- **Description:** Body: { orderId: number, deliveryCode: string (np. "08.01.2026_II") }

#### GET /api/logistics/deliveries/:code/orphan-orders
- **Description:** Pobiera zlecenia przypisane do dostawy ale nieobecne na liście mailowej

#### DELETE /api/logistics/orders/:id/remove-from-delivery
- **Description:** Usuwa zlecenie z dostawy (czyści datę dostawy)

---

### Pvc Warehouse

**Route file:** `routes/pvc-warehouse.ts` | **Handler:** `handlers/pvcWarehouseHandler.ts` | **Validator:** `validators/common.ts`

#### GET /api/pvc-warehouse
- **Description:** Pobiera stan magazynowy profili z filtrami

#### GET /api/pvc-warehouse/demand
- **Description:** Pobiera zapotrzebowanie na profile (z OrderRequirement)

#### GET /api/pvc-warehouse/rw
- **Description:** Pobiera RW (zużycie wewnętrzne) - profile ze zleceń ukończonych w danym miesiącu

#### GET /api/pvc-warehouse/colors
- **Description:** Pobiera wszystkie kolory (dla sidebara)

#### GET /api/pvc-warehouse/systems
- **Description:** Pobiera statystyki systemów (ile profili w każdym)

#### GET /api/pvc-warehouse/orders
- **Description:** Źródło: SchucoOrderItem.deliveryDate

#### GET /api/pvc-warehouse/remanent/:colorId
- **Description:** Gdy brak - używa aktualnego stanu (currentStockBeams z bazy, czyli stan na dziś)

---

### Help

**Route file:** `routes/help.ts` | **Handler:** `handlers/helpHandler.ts` | **Validator:** `validators/common.ts`

#### GET /api/help/pdf/:pageId
- **Description:** Generuje i zwraca PDF z instrukcją obsługi dla danej strony
- **Tags:** help

---

### Gmail

**Route file:** `routes/gmail.ts` | **Handler:** `handlers/gmailHandler.ts` | **Validator:** `validators/common.ts`

#### GET /api/gmail/status
- **Description:** Pobierz status schedulera, konfigurację i statystyki
- **Tags:** gmail

#### POST /api/gmail/fetch
- **Description:** Ręcznie uruchom pobieranie maili z załącznikami CSV
- **Tags:** gmail

#### GET /api/gmail/logs
- **Description:** Pobierz historię pobranych maili z Gmail
- **Tags:** gmail

#### POST /api/gmail/test-connection
- **Description:** Przetestuj połączenie z kontem Gmail przez IMAP
- **Tags:** gmail

---

### Health

**Route file:** `routes/health.ts` | **Handler:** `handlers/healthHandler.ts` | **Validator:** `validators/common.ts`

#### GET /api/health/detailed
- **Description:** Szczegółowy health check wszystkich systemów (tylko ADMIN)
- **Tags:** health

---

## Validators

> Zod validation schemas used across the API.

### validators/akrobud-verification.ts

**Schemas:**
- `createVerificationListSchema` (L13)
- `updateVerificationListSchema` (L22)
- `verificationItemSchema` (L31)
- `addItemsSchema` (L42)
- `parseTextareaSchema` (L53)
- `verifyListSchema` (L60)
- `applyChangesSchema` (L67)
- `updateItemPositionSchema` (L79)
- `handleDuplicatesSchema` (L86)
- `verificationListParamsSchema` (L96)
- `verificationItemParamsSchema` (L97)
- `verificationListQuerySchema` (L103)
- `parseMailContentSchema` (L115)
- `previewProjectsSchema` (L122)
- `createListVersionSchema` (L137)
- `compareVersionsSchema` (L155)
- `verifyProjectListSchema` (L163)
- `listVersionsQuerySchema` (L170)

**Types:**
- `CreateVerificationListInput` (L175)
- `UpdateVerificationListInput` (L176)
- `AddItemsInput` (L177)
- `ParseTextareaInput` (L178)
- `VerifyListInput` (L179)
- `ApplyChangesInput` (L180)
- `UpdateItemPositionInput` (L181)
- `HandleDuplicatesInput` (L182)
- `VerificationListParams` (L183)
- `VerificationItemParams` (L184)
- `VerificationListQuery` (L185)
- `ParseMailContentInput` (L188)
- `PreviewProjectsInput` (L189)
- `CreateListVersionInput` (L190)
- `CompareVersionsInput` (L191)
- `VerifyProjectListInput` (L192)
- `ListVersionsQuery` (L193)

---

### validators/auth.ts

**Schemas:**
- `userRoleSchema` (L19)
- `loginSchema` (L30)
- `loginResponseSchema` (L40)
- `meResponseSchema` (L55)
- `createUserSchema` (L67)
- `updateUserSchema` (L79)

**Types:**
- `LoginInput` (L35)
- `LoginResponse` (L50)
- `MeResponse` (L62)
- `CreateUserInput` (L74)
- `UpdateUserInput` (L86)

---

### validators/bugReport.ts

**Schemas:**
- `bugReportSchema` (L8)
- `bugReportQuerySchema` (L20)

**Types:**
- `BugReportInput` (L33)
- `BugReportQuery` (L34)

---

### validators/color.ts

**Schemas:**
- `createColorSchema` (L8)
- `updateColorSchema` (L16)
- `colorParamsSchema` (L24)

**Types:**
- `CreateColorInput` (L26)
- `UpdateColorInput` (L27)
- `ColorParams` (L28)

---

### validators/common.ts

**Schemas:**
- `dateSchema` (L17)
- `optionalDateSchema` (L24)
- `nullableDateSchema` (L29)
- `idParamsSchema` (L35)
- `paginationQuerySchema` (L44)
- `dateRangeQuerySchema` (L65)
- `positiveIntSchema` (L73)
- `stringToIntSchema` (L78)

**Types:**
- `IdParams` (L84)
- `PaginationQuery` (L85)
- `DateRangeQuery` (L86)

---

### validators/currencyConfig.ts

**Schemas:**
- `updateCurrencyRateSchema` (L7)

**Types:**
- `UpdateCurrencyRateInput` (L15)

---

### validators/dashboard.ts

**Schemas:**
- `monthlyStatsQuerySchema` (L19)
- `dashboardDataSchema` (L31)
- `alertSchema` (L84)
- `alertsResponseSchema` (L94)
- `weekStatSchema` (L100)
- `weeklyStatsResponseSchema` (L111)
- `monthlyStatsResponseSchema` (L119)
- `shortageResultSchema` (L135)
- `weekStatRawSchema` (L149)

**Types:**
- `MonthlyStatsQuery` (L24)
- `DashboardData` (L81)
- `Alert` (L96)
- `AlertsResponse` (L97)
- `WeekStat` (L115)
- `WeeklyStatsResponse` (L116)
- `MonthlyStatsResponse` (L129)
- `ShortageResult` (L147)
- `WeekStatRaw` (L158)

---

### validators/delivery.ts

**Schemas:**
- `createDeliverySchema` (L13)
- `updateDeliverySchema` (L19)
- `deliveryQuerySchema` (L25)
- `deliveryParamsSchema` (L32)
- `addOrderSchema` (L34)
- `moveOrderSchema` (L38)
- `reorderSchema` (L43)
- `addItemSchema` (L47)
- `completeDeliverySchema` (L53)
- `bulkUpdateDatesSchema` (L57)
- `completeAllOrdersSchema` (L63)
- `validateOrderNumbersSchema` (L85)
- `bulkAssignOrdersSchema` (L92)

**Types:**
- `CreateDeliveryInput` (L67)
- `UpdateDeliveryInput` (L68)
- `DeliveryQuery` (L69)
- `DeliveryParams` (L70)
- `AddOrderInput` (L71)
- `MoveOrderInput` (L72)
- `ReorderInput` (L73)
- `AddItemInput` (L74)
- `CompleteDeliveryInput` (L75)
- `BulkUpdateDatesInput` (L76)
- `CompleteAllOrdersInput` (L77)
- `ValidateOrderNumbersInput` (L105)
- `BulkAssignOrdersInput` (L106)

---

### validators/glass.ts

**Schemas:**
- `glassOrderFiltersSchema` (L5)
- `glassOrderIdParamsSchema` (L10)
- `glassOrderStatusUpdateSchema` (L18)
- `glassDeliveryFiltersSchema` (L24)
- `glassDeliveryIdParamsSchema` (L29)
- `glassValidationFiltersSchema` (L39)
- `glassValidationResolveSchema` (L51)
- `glassValidationOrderNumberParamsSchema` (L56)
- `glassValidationIdParamsSchema` (L60)

**Types:**
- `GlassOrderFilters` (L70)
- `GlassOrderIdParams` (L71)
- `GlassOrderStatusUpdate` (L72)
- `GlassDeliveryFilters` (L73)
- `GlassDeliveryIdParams` (L74)
- `GlassValidationFilters` (L75)
- `GlassValidationResolve` (L76)
- `GlassValidationIdParams` (L77)

---

### validators/import.ts

**Schemas:**
- `importParamsSchema` (L8)
- `importQuerySchema` (L10)
- `approveImportSchema` (L14)
- `folderImportSchema` (L19)
- `scanFolderQuerySchema` (L27)
- `previewByFilepathQuerySchema` (L31)
- `processImportSchema` (L35)

**Types:**
- `ImportParams` (L63)
- `ImportQuery` (L64)
- `ApproveImportInput` (L65)
- `FolderImportInput` (L66)
- `ScanFolderQuery` (L67)
- `PreviewByFilepathQuery` (L68)
- `ProcessImportInput` (L69)

---

### validators/label-check.ts

**Schemas:**
- `labelCheckStatusSchema` (L24)
- `labelCheckResultStatusSchema` (L30)
- `createLabelCheckSchema` (L46)
- `labelCheckIdSchema` (L55)
- `labelCheckQuerySchema` (L95)

**Types:**
- `LabelCheckStatus` (L25)
- `LabelCheckResultStatus` (L37)
- `CreateLabelCheckInput` (L49)
- `LabelCheckIdParams` (L61)
- `LabelCheckQueryParams` (L110)

---

### validators/logistics.ts

**Schemas:**
- `itemFlagSchema` (L15)
- `itemStatusSchema` (L27)
- `deliveryStatusSchema` (L30)
- `parseMailSchema` (L35)
- `saveMailItemSchema` (L42)
- `saveMailListSchema` (L58)
- `mailListQuerySchema` (L70)
- `mailListParamsSchema` (L78)
- `deliveryCodeParamsSchema` (L83)
- `versionDiffQuerySchema` (L90)
- `calendarQuerySchema` (L98)
- `updateMailItemSchema` (L106)
- `mailItemParamsSchema` (L114)
- `setOrderDeliveryDateSchema` (L123)

**Types:**
- `ItemFlag` (L131)
- `ItemStatus` (L132)
- `DeliveryStatus` (L133)
- `ParseMailInput` (L134)
- `SaveMailItemInput` (L135)
- `SaveMailListInput` (L136)
- `MailListQuery` (L137)
- `MailListParams` (L138)
- `DeliveryCodeParams` (L139)
- `VersionDiffQuery` (L140)
- `CalendarQuery` (L141)
- `UpdateMailItemInput` (L142)
- `MailItemParams` (L143)
- `SetOrderDeliveryDateInput` (L144)

---

### validators/moja-praca.ts

**Schemas:**
- `conflictsQuerySchema` (L8)
- `dateQuerySchema` (L13)
- `conflictIdParamsSchema` (L25)
- `conflictResolutionSchema` (L34)
- `bulkConflictResolutionSchema` (L44)
- `conflictListItemSchema` (L57)
- `conflictDetailSchema` (L74)
- `conflictsCountSchema` (L89)

**Types:**
- `ConflictsQuery` (L98)
- `DateQuery` (L99)
- `ConflictIdParams` (L100)
- `ConflictResolutionInput` (L101)
- `BulkConflictResolutionInput` (L102)
- `ConflictListItem` (L103)
- `ConflictDetail` (L104)
- `ConflictsCount` (L105)

---

### validators/okuc.ts

**Schemas:**
- `orderClassSchema` (L9)
- `sizeClassSchema` (L10)
- `orderUnitSchema` (L11)
- `warehouseTypeSchema` (L12)
- `subWarehouseSchema` (L13)
- `basketTypeSchema` (L14)
- `createArticleSchema` (L16)
- `updateArticleSchema` (L32)
- `articleFiltersSchema` (L34)
- `addAliasSchema` (L42)
- `stockFiltersSchema` (L48)
- `updateStockSchema` (L56)
- `adjustStockSchema` (L62)
- `transferStockSchema` (L68)
- `demandStatusSchema` (L78)
- `demandSourceSchema` (L86)
- `createDemandSchema` (L88)
- `updateDemandSchema` (L98)
- `demandFiltersSchema` (L105)
- `okucOrderStatusSchema` (L118)
- `createOkucOrderSchema` (L129)
- `updateOkucOrderSchema` (L141)
- `receiveOrderSchema` (L154)
- `proportionTypeSchema` (L166)
- `createProportionSchema` (L178)
- `updateProportionSchema` (L183)
- `eventTypeSchema` (L190)
- `historyFiltersSchema` (L203)
- `importRwSchema` (L216)
- `importDemandSchema` (L227)
- `stockQueryFiltersSchema` (L243)
- `adjustStockRequestSchema` (L251)
- `importStockSchema` (L258)
- `importOrderItemSchema` (L278)
- `parsedOrderImportSchema` (L287)
- `confirmOrderImportSchema` (L297)
- `setReplacementSchema` (L345)

**Types:**
- `StockQueryFilters` (L313)
- `AdjustStockRequest` (L314)
- `ImportStockInput` (L315)
- `CreateArticleInput` (L316)
- `UpdateArticleInput` (L317)
- `ArticleFilters` (L318)
- `StockFilters` (L319)
- `UpdateStockInput` (L320)
- `AdjustStockInput` (L321)
- `TransferStockInput` (L322)
- `CreateDemandInput` (L323)
- `UpdateDemandInput` (L324)
- `DemandFilters` (L325)
- `CreateOkucOrderInput` (L326)
- `UpdateOkucOrderInput` (L327)
- `ReceiveOrderInput` (L328)
- `CreateProportionInput` (L329)
- `UpdateProportionInput` (L330)
- `HistoryFilters` (L331)
- `ImportRwInput` (L332)
- `ImportDemandInput` (L333)
- `ImportOrderItem` (L334)
- `ParsedOrderImport` (L335)
- `ConfirmOrderImportInput` (L336)
- `SetReplacementInput` (L350)

---

### validators/okuc-location.ts

**Schemas:**
- `createOkucLocationSchema` (L9)
- `updateOkucLocationSchema` (L16)
- `reorderOkucLocationsSchema` (L23)
- `okucLocationParamsSchema` (L29)

**Types:**
- `CreateOkucLocationInput` (L35)
- `UpdateOkucLocationInput` (L36)
- `ReorderOkucLocationsInput` (L37)

---

### validators/operator-dashboard.ts

**Schemas:**
- `operatorDashboardQuerySchema` (L7)
- `completenessStatsSchema` (L18)
- `recentActivitySchema` (L28)
- `operatorAlertSchema` (L43)
- `operatorDashboardResponseSchema` (L54)

**Types:**
- `OperatorDashboardQuery` (L12)
- `CompletenessStats` (L26)
- `RecentActivity` (L41)
- `OperatorAlert` (L52)
- `OperatorDashboardResponse` (L66)

---

### validators/order.ts

**Schemas:**
- `createOrderSchema` (L27)
- `updateOrderSchema` (L36)
- `patchOrderSchema` (L44)
- `manualStatusSchema` (L60)
- `specialTypeSchema` (L72)
- `orderParamsSchema` (L78)
- `orderQuerySchema` (L80)
- `bulkUpdateStatusSchema` (L88)
- `revertProductionSchema` (L124)
- `forProductionQuerySchema` (L129)
- `monthlyProductionQuerySchema` (L136)
- `variantTypeSchema` (L142)

**Types:**
- `ManualStatusInput` (L64)
- `SpecialTypeInput` (L76)
- `CreateOrderInput` (L148)
- `UpdateOrderInput` (L149)
- `PatchOrderInput` (L150)
- `OrderParams` (L151)
- `OrderQuery` (L152)
- `BulkUpdateStatusInput` (L153)
- `RevertProductionInput` (L154)
- `ForProductionQuery` (L155)
- `MonthlyProductionQuery` (L156)

---

### validators/pallet.ts

**Schemas:**
- `optimizeDeliveryParamsSchema` (L9)
- `optimizeDeliverySchema` (L13)
- `optimizationOptionsSchema` (L19)
- `optimizeDeliveryBodySchema` (L35)
- `palletTypeSchema` (L41)
- `updatePalletTypeSchema` (L50)
- `palletTypeParamsSchema` (L52)
- `packingRuleSchema` (L58)
- `updatePackingRuleSchema` (L65)
- `packingRuleParamsSchema` (L67)

**Types:**
- `OptimizeDeliveryParams` (L73)
- `OptimizeDeliveryInput` (L74)
- `OptimizationOptionsInput` (L75)
- `OptimizeDeliveryBody` (L76)
- `PalletTypeInput` (L77)
- `UpdatePalletTypeInput` (L78)
- `PalletTypeParams` (L79)
- `PackingRuleInput` (L80)
- `UpdatePackingRuleInput` (L81)
- `PackingRuleParams` (L82)

---

### validators/pallet-stock.ts

**Schemas:**
- `ProductionPalletTypeSchema` (L17)
- `PalletDayStatusSchema` (L30)
- `GetPalletDayParamsSchema` (L40)
- `GetPalletMonthParamsSchema` (L49)
- `UpdatePalletDayEntriesSchema` (L77)
- `CorrectMorningStockSchema` (L85)
- `UpdateAlertConfigSchema` (L109)
- `SetInitialStocksSchema` (L130)

**Types:**
- `ProductionPalletType` (L139)
- `PalletDayStatus` (L140)
- `GetPalletDayParams` (L141)
- `GetPalletMonthParams` (L142)
- `PalletDayEntry` (L143)
- `UpdatePalletDayEntriesInput` (L144)
- `CorrectMorningStockInput` (L145)
- `AlertConfigEntry` (L146)
- `UpdateAlertConfigInput` (L147)
- `InitialStockEntry` (L148)
- `SetInitialStocksInput` (L149)

---

### validators/production-reports.ts

**Schemas:**
- `productionReportParamsSchema` (L9)
- `updateReportItemSchema` (L15)
- `updateInvoiceSchema` (L27)
- `updateAtypicalSchema` (L33)

**Types:**
- `ProductionReportParams` (L42)
- `UpdateReportItemInput` (L43)
- `UpdateInvoiceInput` (L44)
- `UpdateAtypicalInput` (L45)

---

### validators/productionPlanning.ts

**Schemas:**
- `efficiencyConfigSchema` (L8)
- `updateEfficiencyConfigSchema` (L18)
- `efficiencyConfigIdSchema` (L22)
- `productionSettingSchema` (L31)
- `updateProductionSettingSchema` (L37)
- `productionCalendarSchema` (L46)
- `updateProductionCalendarSchema` (L53)
- `updateProfilePalletizedSchema` (L59)
- `bulkUpdateProfilePalletizedSchema` (L63)
- `updateColorTypicalSchema` (L75)
- `bulkUpdateColorTypicalSchema` (L79)

**Types:**
- `EfficiencyConfigInput` (L26)
- `UpdateEfficiencyConfigInput` (L27)
- `ProductionSettingInput` (L42)
- `ProductionCalendarInput` (L55)
- `UpdateProfilePalletizedInput` (L70)
- `BulkUpdateProfilePalletizedInput` (L71)
- `UpdateColorTypicalInput` (L86)
- `BulkUpdateColorTypicalInput` (L87)

---

### validators/profile.ts

**Schemas:**
- `createProfileSchema` (L8)
- `updateProfileSchema` (L15)
- `profileParamsSchema` (L28)
- `updateProfileOrderSchema` (L30)

**Types:**
- `CreateProfileInput` (L39)
- `UpdateProfileInput` (L40)
- `ProfileParams` (L41)
- `UpdateProfileOrderInput` (L42)

---

### validators/profileDepth.ts

**Schemas:**
- `profileDepthSchema` (L9)
- `updateProfileDepthSchema` (L15)
- `profileDepthParamsSchema` (L17)

**Types:**
- `ProfileDepthInput` (L23)
- `UpdateProfileDepthInput` (L24)
- `ProfileDepthParams` (L25)

---

### validators/profilePalletConfig.ts

**Schemas:**
- `profilePalletConfigSchema` (L10)
- `updateProfilePalletConfigSchema` (L15)
- `profilePalletConfigParamsSchema` (L19)

**Types:**
- `ProfilePalletConfigInput` (L25)
- `UpdateProfilePalletConfigInput` (L26)
- `ProfilePalletConfigParams` (L27)

---

### validators/schuco.ts

**Schemas:**
- `getDeliveriesQuerySchema` (L3)

**Types:**
- `GetDeliveriesQuery` (L23)

---

### validators/settings.ts

**Schemas:**
- `settingKeySchema` (L8)
- `settingValueSchema` (L12)
- `upsertOneSettingSchema` (L16)
- `upsertManySettingsSchema` (L21)
- `createPalletTypeSchema` (L26)
- `updatePalletTypeSchema` (L36)
- `palletTypeIdSchema` (L49)
- `createPackingRuleSchema` (L56)
- `updatePackingRuleSchema` (L65)
- `packingRuleIdSchema` (L77)
- `updateUserFolderPathSchema` (L84)
- `validateFolderSchema` (L90)

**Types:**
- `SettingKeyParams` (L97)
- `SettingValueBody` (L98)
- `CreatePalletTypeBody` (L99)
- `UpdatePalletTypeBody` (L100)
- `CreatePackingRuleBody` (L101)
- `UpdatePackingRuleBody` (L102)
- `UpdateUserFolderPathBody` (L103)
- `ValidateFolderBody` (L104)

---

### validators/steel.ts

**Schemas:**
- `createSteelSchema` (L7)
- `updateSteelSchema` (L16)
- `updateSteelOrdersSchema` (L25)
- `updateSteelStockSchema` (L35)

**Types:**
- `CreateSteelInput` (L41)
- `UpdateSteelInput` (L42)
- `UpdateSteelOrdersInput` (L43)
- `UpdateSteelStockInput` (L44)

---

### validators/timesheets.ts

**Schemas:**
- `createWorkerSchema` (L13)
- `updateWorkerSchema` (L21)
- `workerParamsSchema` (L29)
- `workerQuerySchema` (L31)
- `createPositionSchema` (L39)
- `updatePositionSchema` (L46)
- `positionParamsSchema` (L53)
- `createNonProductiveTaskTypeSchema` (L59)
- `updateNonProductiveTaskTypeSchema` (L65)
- `nonProductiveTaskTypeParamsSchema` (L71)
- `createSpecialWorkTypeSchema` (L77)
- `updateSpecialWorkTypeSchema` (L84)
- `specialWorkTypeParamsSchema` (L91)
- `absenceTypeSchema` (L98)
- `createTimeEntrySchema` (L124)
- `updateTimeEntrySchema` (L144)
- `timeEntryParamsSchema` (L164)
- `timeEntryQuerySchema` (L167)
- `setStandardDaySchema` (L185)
- `setAbsenceRangeSchema` (L192)
- `calendarQuerySchema` (L204)
- `daySummaryQuerySchema` (L209)

**Types:**
- `CreateWorkerInput` (L217)
- `UpdateWorkerInput` (L218)
- `WorkerParams` (L219)
- `WorkerQuery` (L220)
- `CreatePositionInput` (L222)
- `UpdatePositionInput` (L223)
- `PositionParams` (L224)
- `CreateNonProductiveTaskTypeInput` (L226)
- `UpdateNonProductiveTaskTypeInput` (L227)
- `NonProductiveTaskTypeParams` (L228)
- `CreateSpecialWorkTypeInput` (L230)
- `UpdateSpecialWorkTypeInput` (L231)
- `SpecialWorkTypeParams` (L232)
- `CreateTimeEntryInput` (L234)
- `UpdateTimeEntryInput` (L235)
- `TimeEntryParams` (L236)
- `TimeEntryQuery` (L237)
- `SetStandardDayInput` (L239)
- `SetAbsenceRangeInput` (L240)
- `CalendarQuery` (L241)
- `DaySummaryQuery` (L242)
- `AbsenceType` (L243)

---

### validators/warehouse.ts

**Schemas:**
- `warehouseStatsQuerySchema` (L12)
- `warehouseOrderParamsSchema` (L17)
- `updateWarehouseOrderSchema` (L19)
- `colorIdParamSchema` (L36)
- `profileColorParamsSchema` (L46)
- `updateStockBodySchema` (L59)
- `monthlyUpdateBodySchema` (L72)
- `rollbackInventoryBodySchema` (L100)
- `finalizeMonthBodySchema` (L113)
- `historyQuerySchema` (L124)
- `averageQuerySchema` (L138)

**Types:**
- `WarehouseStatsQuery` (L24)
- `WarehouseOrderParams` (L25)
- `UpdateWarehouseOrderInput` (L26)
- `ColorIdParams` (L152)
- `ProfileColorParams` (L153)
- `UpdateStockBody` (L154)
- `MonthlyUpdateBody` (L155)
- `RollbackInventoryBody` (L156)
- `FinalizeMonthBody` (L157)
- `HistoryQuery` (L158)
- `AverageQuery` (L159)

---

### validators/warehouse-orders.ts

**Schemas:**
- `warehouseOrderQuerySchema` (L4)
- `warehouseOrderIdParamsSchema` (L13)
- `createWarehouseOrderSchema` (L20)
- `updateWarehouseOrderSchema` (L33)

**Types:**
- `WarehouseOrderQuery` (L10)
- `WarehouseOrderIdParams` (L17)
- `CreateWarehouseOrderInput` (L30)
- `UpdateWarehouseOrderInput` (L42)

---
