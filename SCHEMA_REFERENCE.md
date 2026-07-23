# Schema Reference - AKROBUD
> Auto-generated: 2026-02-25
> Modeli: 86 | Zrodlo: apps/api/prisma/schema.prisma

## Quick Lookup
| Model | Tabela | Pola kluczowe | Relacje | Soft Delete |
|-------|--------|---------------|---------|-------------|
| User | users | email | notes[], warehouseHistory[], warehouseOrdersCreated[], warehouseUpdates[], folderSettings, importLocks[], ...(+16) | tak |
| DocumentAuthorMapping | document_author_mappings | authorName | user | - |
| Profile | profiles | number, articleNumber | orderRequirements[], profileColors[], warehouseHistory[], warehouseOrders[], warehouseStock[], profilePalletConfig | - |
| Color | colors | code | orderRequirements[], profileColors[], warehouseHistory[], warehouseOrders[], warehouseStock[] | - |
| PrivateColor | private_colors | code | orderRequirements[] | - |
| ProfileColor | profile_colors | - | color, profile | - |
| Order | orders | orderNumber, status, valuePln, valueEur, totalGlasses | documentAuthorUser, deletedByUser, deliveryOrders[], monthlyReportItems[], orderNotes[], requirements[], ...(+11) | tak |
| OrderRequirement | order_requirements | status | color, privateColor, profile, order | - |
| OrderWindow | order_windows | - | order, materials[] | - |
| OrderGlass | order_glasses | - | order | - |
| OrderMaterial | order_materials | assemblyValueBeforeDiscount, assemblyValueAfterDiscount, netValue, totalNet | order, orderWindow | - |
| WarehouseStock | warehouse_stock | - | updatedBy, color, profile | tak |
| WarehouseOrder | warehouse_orders | status | createdBy, color, profile | - |
| WarehouseHistory | warehouse_history | - | recordedBy, color, profile | - |
| Delivery | deliveries | status | deliveryItems[], deliveryOrders[], optimization, verificationLists[], labelChecks[], readiness, ...(+1) | tak |
| DeliveryReadiness | delivery_readiness | deliveryId, aggregatedStatus | delivery | - |
| DeliveryOrder | delivery_orders | - | order, delivery | - |
| DeliveryItem | delivery_items | - | delivery | - |
| PalletType | pallet_types | - | - | - |
| ProfileDepth | profile_depths | profileType | - | - |
| ProfilePalletConfig | profile_pallet_configs | profileId | profile | - |
| PackingRule | packing_rules | - | - | - |
| PalletOptimization | pallet_optimizations | deliveryId, totalPallets, validationStatus | pallets[], delivery | - |
| OptimizedPallet | optimized_pallets | - | optimization | - |
| FileImport | file_imports | status | glassDeliveries[], pendingOrderPrices[] | tak |
| Setting | settings | key, value | - | - |
| Note | notes | - | createdBy, order | - |
| WorkingDay | working_days | date | - | - |
| SchucoDelivery | schuco_deliveries | orderNumber, shippingStatus, totalAmount, previousValues | orderLinks[], items[] | - |
| SchucoFetchLog | schuco_fetch_logs | status | - | - |
| GmailFetchLog | gmail_fetch_logs | status | - | - |
| SchucoOrderItem | schuco_order_items | previousValues | schucoDelivery | - |
| MonthlyReport | monthly_reports | totalOrders, totalWindows, totalSashes, totalValuePln, totalValueEur | reportItems[] | - |
| MonthlyReportItem | monthly_report_items | valuePln, valueEur | order, report | - |
| CurrencyConfig | currency_config | - | - | - |
| GlassDelivery | glass_deliveries | - | fileImport, items[], looseGlasses[], aluminumGlasses[], reclamationGlasses[] | - |
| GlassDeliveryItem | glass_delivery_items | matchStatus | glassOrder, glassDelivery | - |
| GlassOrderItem | glass_order_items | - | glassOrder | - |
| GlassOrderValidation | glass_order_validations | - | glassOrder | - |
| GlassOrder | glass_orders | glassOrderNumber, status | deliveryItems[], items[], validationResults[] | tak |
| OrderSchucoLink | order_schuco_links | - | order, schucoDelivery | - |
| UserFolderSettings | user_folder_settings | userId | user | - |
| ImportLock | import_locks | folderPath | user | - |
| PendingOrderPrice | pending_order_prices | valueNetto, valueBrutto, status | fileImport | - |
| OkucLocation | okuc_locations | name | articles[] | tak |
| OkucArticle | okuc_articles | articleId | location, aliases[], proportionsSource[], proportionsTarget[], stocks[], demands[], ...(+4) | tak |
| OkucArticleAlias | okuc_article_aliases | aliasNumber | article | - |
| OkucProportion | okuc_proportions | - | sourceArticle, targetArticle | tak |
| OkucStock | okuc_stocks | - | article, updatedBy | - |
| OkucDemand | okuc_demands | demandId, status | article, order | tak |
| OkucOrder | okuc_orders | orderNumber, status | items[], createdBy | tak |
| OkucOrderItem | okuc_order_items | - | okucOrder, article | - |
| OkucHistory | okuc_history | - | article, recordedBy, editedBy | - |
| LooseGlass | loose_glasses | - | glassDelivery | - |
| AluminumGlass | aluminum_glasses | - | glassDelivery | - |
| ReclamationGlass | reclamation_glasses | - | glassDelivery | - |
| AkrobudVerificationList | akrobud_verification_lists | status | delivery, items[], parent, children[] | tak |
| AkrobudVerificationItem | akrobud_verification_items | matchStatus | list, matchedOrder, matchedOrders[] | - |
| VerificationItemOrder | verification_item_orders | - | item, order | - |
| Worker | workers | - | timeEntries[] | - |
| Position | positions | name | timeEntries[] | - |
| NonProductiveTaskType | non_productive_task_types | name | tasks[] | - |
| TimeEntry | time_entries | - | worker, position, nonProductiveTasks[], specialWorks[] | - |
| NonProductiveTask | non_productive_tasks | - | timeEntry, taskType | - |
| SpecialWorkType | special_work_types | name | specialWorks[] | - |
| SpecialWork | special_works | - | timeEntry, specialType | - |
| PalletStockDay | pallet_stock_days | date, status | entries[] | - |
| PalletStockEntry | pallet_stock_entries | - | palletDay | - |
| PalletAlertConfig | pallet_alert_configs | type | - | - |
| PalletInitialStock | pallet_initial_stocks | type | updatedBy | - |
| ProductionReport | production_reports | status, atypicalValuePln | closedBy, reopenedBy, items[] | - |
| ProductionReportItem | production_report_items | overrideValuePln, overrideValueEur, overrideMaterialValue | report, order | - |
| PendingImportConflict | pending_import_conflicts | status | baseOrder, authorUser, resolvedBy | - |
| ProductionEfficiencyConfig | production_efficiency_configs | clientType | - | - |
| ProductionCalendar | production_calendar | date | - | - |
| ProductionSettings | production_settings | key, value | - | - |
| Steel | steels | number, articleNumber | steelStock[], steelOrders[], steelHistory[], orderSteelRequirements[] | - |
| SteelStock | steel_stock | steelId | steel, updatedBy | tak |
| SteelOrder | steel_orders | status | steel, createdBy | - |
| SteelHistory | steel_history | - | steel, recordedBy | - |
| OrderSteelRequirement | order_steel_requirements | status | order, steel | - |
| LabelCheck | label_checks | status, totalOrders | delivery, results[] | tak |
| LabelCheckResult | label_check_results | status | labelCheck | - |
| LogisticsMailList | logistics_mail_lists | - | delivery, items[] | tak |
| LogisticsMailItem | logistics_mail_items | itemStatus | order, mailList, decisionLogs[] | tak |
| LogisticsDecisionLog | logistics_decision_logs | - | user, mailItem | - |

---

## Szczegoly modeli

### User
**Tabela:** `users` | **Soft Delete:** tak (deletedAt)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| email | String | tak | - | @unique |
| passwordHash | String | tak | - | - |
| name | String | tak | - | - |
| role | String | tak | user | owner / admin / kierownik / ksiegowa / user |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |
| deletedAt | DateTime | - | - | Soft delete - data usunięcia użytkownika |

**Relacje:**
- `notes` -> Note[] (one-to-many)
- `warehouseHistory` -> WarehouseHistory[] (one-to-many)
- `warehouseOrdersCreated` -> WarehouseOrder[] (one-to-many)
- `warehouseUpdates` -> WarehouseStock[] (one-to-many)
- `folderSettings` -> UserFolderSettings (many-to-one)
- `importLocks` -> ImportLock[] (one-to-many)
- `okucStockUpdates` -> OkucStock[] (one-to-many)
- `okucOrdersCreated` -> OkucOrder[] (one-to-many)
- `okucHistoryRecorded` -> OkucHistory[] (one-to-many)
- `okucHistoryEdited` -> OkucHistory[] (one-to-many)
- `closedProductionReports` -> ProductionReport[] (one-to-many)
- `reopenedProductionReports` -> ProductionReport[] (one-to-many)
- `ordersAsDocumentAuthor` -> Order[] (one-to-many)
- `authorMappings` -> DocumentAuthorMapping[] (one-to-many)
- `importConflictsAsAuthor` -> PendingImportConflict[] (one-to-many)
- `importConflictsResolved` -> PendingImportConflict[] (one-to-many)
- `steelStockUpdates` -> SteelStock[] (one-to-many)
- `steelOrdersCreated` -> SteelOrder[] (one-to-many)
- `steelHistoryRecorded` -> SteelHistory[] (one-to-many)
- `palletInitialStockUpdates` -> PalletInitialStock[] (one-to-many)
- `logisticsDecisionLogs` -> LogisticsDecisionLog[] (one-to-many)
- `deletedOrders` -> Order[] (one-to-many)

### DocumentAuthorMapping
**Tabela:** `document_author_mappings`
> Mapowanie nazw autorów dokumentów z CSV na użytkowników systemu

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| authorName | String | tak | - | @unique, Nazwa autora z CSV (np. "Wlodek", "Arek", "Krzysztof") |
| userId | Int | tak | - | FK, ID użytkownika systemu |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `user` -> User (many-to-one)

### Profile
**Tabela:** `profiles`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| number | String | tak | - | @unique |
| articleNumber | String | - | - | @unique |
| name | String | tak | - | - |
| description | String | - | - | - |
| sortOrder | Int | tak | 0 | - |
| isAkrobud | Boolean | tak | false | Czy pokazywać w magazynie Akrobud |
| isLiving | Boolean | tak | false | Systemy profilowe - do których systemów pasuje profil |
| isBlok | Boolean | tak | false | - |
| isVlak | Boolean | tak | false | - |
| isCt70 | Boolean | tak | false | - |
| isFocusing | Boolean | tak | false | - |
| profileType | String | tak | typical | Planowanie produkcji - dodane 2026-01-15 'typical' / 'atypical' - wpływa na lead time |
| isPalletized | Boolean | tak | false | Czy profil jest w paletach (przygotowanie sobota) |
| efficiencyCoeff | Decimal | - | - | Współczynnik wydajności (np. 0.9 = wolniejszy o 10%) |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `orderRequirements` -> OrderRequirement[] (one-to-many)
- `profileColors` -> ProfileColor[] (one-to-many)
- `warehouseHistory` -> WarehouseHistory[] (one-to-many)
- `warehouseOrders` -> WarehouseOrder[] (one-to-many)
- `warehouseStock` -> WarehouseStock[] (one-to-many)
- `profilePalletConfig` -> ProfilePalletConfig (many-to-one)

### Color
**Tabela:** `colors`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| code | String | tak | - | @unique |
| name | String | tak | - | - |
| type | String | tak | - | - |
| hexColor | String | - | - | - |
| isAkrobud | Boolean | tak | false | Czy pokazywać w magazynie Akrobud |
| isTypical | Boolean | tak | true | Planowanie produkcji - dodane 2026-01-15 Czy kolor typowy (grupowany w produkcji) |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `orderRequirements` -> OrderRequirement[] (one-to-many)
- `profileColors` -> ProfileColor[] (one-to-many)
- `warehouseHistory` -> WarehouseHistory[] (one-to-many)
- `warehouseOrders` -> WarehouseOrder[] (one-to-many)
- `warehouseStock` -> WarehouseStock[] (one-to-many)

### PrivateColor
**Tabela:** `private_colors`
> Kolory prywatne (zewnętrzne) - automatycznie tworzone podczas importu uzyte_bele_prywatne Nie są częścią standardowej palety Akrobud, ale muszą być śledzone dla raportów

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| code | String | tak | - | @unique, Numer koloru z importu (np. "354", "170") |
| name | String | - | - | Opcjonalna nazwa do uzupełnienia przez użytkownika |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `orderRequirements` -> OrderRequirement[] (one-to-many)

### ProfileColor
**Tabela:** `profile_colors`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| profileId | Int | tak | - | FK |
| colorId | Int | tak | - | FK |
| isVisible | Boolean | tak | true | - |

**Relacje:**
- `color` -> Color (many-to-one)
- `profile` -> Profile (many-to-one)

**Indeksy:**
- `@@unique([profileId, colorId])`
- `@@index([profileId])`
- `@@index([colorId])`

### Order
**Tabela:** `orders` | **Soft Delete:** tak (deletedAt)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| orderNumber | String | tak | - | @unique |
| status | String | tak | new | - |
| client | String | - | - | - |
| project | String | - | - | - |
| system | String | - | - | - |
| deadline | DateTime | - | - | - |
| pvcDeliveryDate | DateTime | - | - | - |
| valuePln | Int | - | - | - |
| valueEur | Int | - | - | - |
| priceInheritedFromOrder | String | - | - | Numer zamówienia bazowego z którego odziedziczono cenę (np. "53477" dla "53477-a") |
| invoiceNumber | String | - | - | - |
| deliveryDate | DateTime | - | - | - |
| productionDate | DateTime | - | - | - |
| glassDeliveryDate | DateTime | - | - | - |
| notes | String | - | - | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |
| archivedAt | DateTime | - | - | - |
| totalGlasses | Int | - | - | - |
| totalSashes | Int | - | - | - |
| totalWindows | Int | - | - | - |
| completedAt | DateTime | - | - | - |
| orderedGlassCount | Int | - | 0 | - |
| deliveredGlassCount | Int | - | 0 | - |
| glassOrderStatus | String | - | not_ordered | - |
| glassOrderNote | String | - | - | Notatka z zamówienia szyb (np. "Zam. - szprosy") |
| okucDemandStatus | String | - | none | Status okuć dla zlecenia: 'none' / 'no_okuc' / 'imported' / 'has_atypical' / 'pending' none - brak zapotrzebowania, no_okuc - zlecenie bez okuć (pusty plik), imported - zaimportowano, has_atypical - są nietypowe, pending - czeka na zlecenie |
| variantType | String | - | - | P1-2: Typ wariantu zlecenia 'correction' - korekta oryginału (musi być w tej samej dostawie co oryginał) 'additional_file' - dodatkowy plik do zamówienia (może być w innej dostawie) null - nie określono (domyślnie, wymagane dla wariantów z literką) |
| documentAuthor | String | - | - | Autor dokumentu z CSV (np. "Wlodek", "Arek", "Krzysztof") |
| documentAuthorUserId | Int | - | - | FK, Przypisany użytkownik systemu (jeśli znaleziono mapowanie) |
| windowsNetValue | Int | - | - | Sumy z materiałówki - wartości w groszach Suma netto okien (kategoria 'okno') |
| windowsMaterial | Int | - | - | Suma materiału okien (kategoria 'okno') |
| assemblyValue | Int | - | - | Suma montażu (kategoria 'montaz') |
| extrasValue | Int | - | - | Suma dodatków (kategoria 'dodatki') |
| otherValue | Int | - | - | Suma inne (kategoria 'inne') |
| manualStatus | String | - | - | Ręczny status ustawiony przez użytkownika 'do_not_cut' - NIE CIĄĆ (żółte tło, okucia nie w zapotrzebowaniu) 'cancelled' - Anulowane (czerwone tło, archiwizacja po 30 dniach, cofnij profile/okucia z zapotrzebowania) 'on_hold' - Wstrzymane (pomarańczowe tło) null - brak ręcznego statusu |
| manualStatusSetAt | DateTime | - | - | - |
| specialType | String | - | - | Typ specjalny zlecenia (nietypówka): 'drzwi', 'psk', 'hs', 'ksztalt' null - brak typu specjalnego (standardowe zlecenie) |
| deletedAt | DateTime | - | - | Soft delete - data usunięcia zlecenia |
| deletedByUserId | Int | - | - | FK |

**Relacje:**
- `documentAuthorUser` -> User (many-to-one)
- `deletedByUser` -> User (many-to-one)
- `deliveryOrders` -> DeliveryOrder[] (one-to-many)
- `monthlyReportItems` -> MonthlyReportItem[] (one-to-many)
- `orderNotes` -> Note[] (one-to-many)
- `requirements` -> OrderRequirement[] (one-to-many)
- `windows` -> OrderWindow[] (one-to-many)
- `glasses` -> OrderGlass[] (one-to-many)
- `materials` -> OrderMaterial[] (one-to-many)
- `schucoLinks` -> OrderSchucoLink[] (one-to-many)
- `okucDemands` -> OkucDemand[] (one-to-many)
- `verificationItems` -> AkrobudVerificationItem[] (one-to-many)
- `verificationItemOrders` -> VerificationItemOrder[] (one-to-many)
- `productionReportItems` -> ProductionReportItem[] (one-to-many)
- `conflictsAsBase` -> PendingImportConflict[] (one-to-many)
- `steelRequirements` -> OrderSteelRequirement[] (one-to-many)
- `logisticsMailItems` -> LogisticsMailItem[] (one-to-many)

**Indeksy:**
- `@@index([status])`
- `@@index([archivedAt])`
- `@@index([createdAt])`
- `@@index([invoiceNumber, createdAt])`
- `@@index([invoiceNumber, deliveryDate])`
- `@@index([status, archivedAt])`
- `@@index([glassOrderStatus])`
- `@@index([glassOrderStatus, archivedAt])`
- `@@index([deliveryDate, status])`
- `@@index([okucDemandStatus])`
- `@@index([productionDate])`
- `@@index([completedAt])`
- `@@index([documentAuthorUserId, archivedAt])`
- `@@index([manualStatus])`
- `@@index([deletedAt])`

### OrderRequirement
**Tabela:** `order_requirements`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| orderId | Int | tak | - | FK |
| profileId | Int | tak | - | FK |
| colorId | Int | - | - | FK, Kolor Akrobud (null jeśli użyto privateColor) |
| privateColorId | Int | - | - | FK, Kolor prywatny (dla importów prywatnych) |
| beamsCount | Int | tak | - | - |
| meters | Float | tak | - | - |
| restMm | Int | tak | - | - |
| status | String | tak | pending | pending / completed (dla RW) |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `color` -> Color (many-to-one)
- `privateColor` -> PrivateColor (many-to-one)
- `profile` -> Profile (many-to-one)
- `order` -> Order (many-to-one)

**Indeksy:**
- `@@unique([orderId, profileId, colorId])`
- `@@unique([orderId, profileId, privateColorId])`
- `@@index([colorId])`
- `@@index([privateColorId])`
- `@@index([profileId])`
- `@@index([createdAt])`
- `@@index([status])`

### OrderWindow
**Tabela:** `order_windows`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| orderId | Int | tak | - | FK |
| position | Int | tak | 0 | Numer pozycji (Lp. z listy okien) |
| widthMm | Int | tak | - | - |
| heightMm | Int | tak | - | - |
| profileType | String | tak | - | - |
| quantity | Int | tak | - | - |
| reference | String | - | - | - |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `order` -> Order (many-to-one)
- `materials` -> OrderMaterial[] (one-to-many)

**Indeksy:**
- `@@index([profileType])`
- `@@index([orderId, position])`

### OrderGlass
**Tabela:** `order_glasses`
> Szyby przypisane do zlecenia (wstępna lista z pliku uzyte_bele)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| orderId | Int | tak | - | FK |
| lp | Int | tak | - | Lp. z pliku CSV |
| position | Int | tak | - | Pozycja (odpowiada Lp. z listy okien) |
| widthMm | Int | tak | - | Szerokość w mm |
| heightMm | Int | tak | - | Wysokość w mm |
| quantity | Int | tak | - | Ilość sztuk |
| packageType | String | tak | - | Typ pakietu np. "4/18/4/18/4S3 Ug=0.5" |
| areaSqm | Float | tak | - | Obliczona powierzchnia w m² |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `order` -> Order (many-to-one)

**Indeksy:**
- `@@index([orderId])`
- `@@index([position])`

### OrderMaterial
**Tabela:** `order_materials`
> Materiałówka - pozycje kosztowe z pliku uzyte_bele Kategorie: 'okno' (przypisana do okna), 'montaz' (tylko wartość montażu),            'dodatki' (pozycja > liczba okien), 'inne' (material=0 ale wartość netto > 0)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| orderId | Int | tak | - | FK |
| orderWindowId | Int | - | - | FK, Powiązanie z oknem (tylko dla kategorii 'okno') |
| position | Int | tak | - | Numer pozycji z pliku |
| category | String | tak | - | 'okno' / 'montaz' / 'dodatki' / 'inne' |
| glazing | Int | tak | 0 | Szklenia w groszach |
| fittings | Int | tak | 0 | Okucia w groszach |
| parts | Int | tak | 0 | Części w groszach |
| glassQuantity | Int | tak | 0 | Ilość szkła |
| material | Int | tak | 0 | Materiał w groszach |
| assemblyValueBeforeDiscount | Int | tak | 0 | Wartość netto montażu przed rabatem w groszach |
| assemblyValueAfterDiscount | Int | tak | 0 | Wartość netto montażu po rabacie w groszach |
| netValue | Int | tak | 0 | Wartość netto w groszach |
| totalNet | Int | tak | 0 | Suma netto w groszach |
| quantity | Int | tak | 1 | Sztuk |
| coefficient | Float | - | - | Współczynnik |
| unit | Float | - | - | Jednostka |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `order` -> Order (many-to-one)
- `orderWindow` -> OrderWindow (many-to-one)

**Indeksy:**
- `@@index([orderId])`
- `@@index([category])`
- `@@index([orderWindowId])`

### WarehouseStock
**Tabela:** `warehouse_stock` | **Soft Delete:** tak (deletedAt)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| profileId | Int | tak | - | FK |
| colorId | Int | tak | - | FK |
| currentStockBeams | Int | tak | 0 | - |
| updatedAt | DateTime | tak | - | @updatedAt |
| updatedById | Int | - | - | FK |
| initialStockBeams | Int | tak | 0 | - |
| remanentDate | DateTime | - | - | Data ostatniego remanentu - ustawiana ręcznie, NIE automatycznie |
| version | Int | tak | 0 | - |
| deletedAt | DateTime | - | - | - |

**Relacje:**
- `updatedBy` -> User (many-to-one)
- `color` -> Color (many-to-one)
- `profile` -> Profile (many-to-one)

**Indeksy:**
- `@@unique([profileId, colorId])`
- `@@index([deletedAt])`
- `@@index([colorId])`
- `@@index([updatedById])`

### WarehouseOrder
**Tabela:** `warehouse_orders`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| profileId | Int | tak | - | FK |
| colorId | Int | tak | - | FK |
| orderedBeams | Int | tak | - | - |
| expectedDeliveryDate | DateTime | tak | - | - |
| status | String | tak | pending | - |
| notes | String | - | - | - |
| createdAt | DateTime | tak | now() | - |
| createdById | Int | - | - | FK |

**Relacje:**
- `createdBy` -> User (many-to-one)
- `color` -> Color (many-to-one)
- `profile` -> Profile (many-to-one)

**Indeksy:**
- `@@unique([profileId, colorId, expectedDeliveryDate])`
- `@@index([status])`
- `@@index([expectedDeliveryDate])`
- `@@index([colorId, status])`

### WarehouseHistory
**Tabela:** `warehouse_history`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| profileId | Int | tak | - | FK |
| colorId | Int | tak | - | FK |
| calculatedStock | Int | tak | - | - |
| actualStock | Int | tak | - | - |
| difference | Int | tak | - | - |
| previousStock | Int | - | - | - |
| currentStock | Int | - | - | - |
| changeType | String | - | - | - |
| notes | String | - | - | - |
| recordedAt | DateTime | tak | now() | - |
| recordedById | Int | - | - | FK |

**Relacje:**
- `recordedBy` -> User (many-to-one)
- `color` -> Color (many-to-one)
- `profile` -> Profile (many-to-one)

**Indeksy:**
- `@@index([colorId])`
- `@@index([profileId])`
- `@@index([recordedAt])`
- `@@index([changeType])`

### Delivery
**Tabela:** `deliveries` | **Soft Delete:** tak (deletedAt)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| deliveryDate | DateTime | tak | - | - |
| deliveryNumber | String | - | - | - |
| status | String | tak | planned | - |
| notes | String | - | - | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |
| deletedAt | DateTime | - | - | - |

**Relacje:**
- `deliveryItems` -> DeliveryItem[] (one-to-many)
- `deliveryOrders` -> DeliveryOrder[] (one-to-many)
- `optimization` -> PalletOptimization (many-to-one)
- `verificationLists` -> AkrobudVerificationList[] (one-to-many)
- `labelChecks` -> LabelCheck[] (one-to-many)
- `readiness` -> DeliveryReadiness (many-to-one)
- `logisticsMailLists` -> LogisticsMailList[] (one-to-many)

**Indeksy:**
- `@@index([status])`
- `@@index([deliveryDate])`
- `@@index([createdAt])`
- `@@index([deliveryDate, status])`
- `@@index([status, deliveryDate])`
- `@@index([deletedAt])`
- `@@index([status, deletedAt])`

### DeliveryReadiness
**Tabela:** `delivery_readiness`
> Agregowany status gotowości dostawy Przechowuje wyliczony status z wszystkich modułów sprawdzających Status: ready (🟢) | conditional (🟠) | blocked (🔴) | pending

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| deliveryId | Int | tak | - | @unique, FK |
| aggregatedStatus | String | tak | pending | Agregowany status: ready / conditional / blocked / pending |
| lastCalculatedAt | DateTime | tak | now() | Timestamp ostatniego przeliczenia |
| blockingCount | Int | tak | 0 | Liczniki dla szybkiego dostępu w UI |
| warningCount | Int | tak | 0 | - |
| moduleResults | String | - | - | Szczegółowe wyniki z każdego modułu (JSON) Format: [{ module: string, status: 'ok'/'warning'/'blocking', message: string }] |
| blockingReasons | String | - | - | Powody blokady (JSON array of strings) - skrót dla UI |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `delivery` -> Delivery (many-to-one)

**Indeksy:**
- `@@index([aggregatedStatus])`
- `@@index([lastCalculatedAt])`

### DeliveryOrder
**Tabela:** `delivery_orders`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| deliveryId | Int | tak | - | FK |
| orderId | Int | tak | - | FK |
| position | Int | tak | - | - |

**Relacje:**
- `order` -> Order (many-to-one)
- `delivery` -> Delivery (many-to-one)

**Indeksy:**
- `@@unique([deliveryId, orderId])`
- `@@index([deliveryId, position])`
- `@@index([orderId])`

### DeliveryItem
**Tabela:** `delivery_items`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| deliveryId | Int | tak | - | FK |
| itemType | String | tak | - | - |
| description | String | tak | - | - |
| quantity | Int | tak | - | - |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `delivery` -> Delivery (many-to-one)

**Indeksy:**
- `@@index([deliveryId])`

### PalletType
**Tabela:** `pallet_types`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| name | String | tak | - | - |
| lengthMm | Int | tak | - | - |
| widthMm | Int | tak | - | - |
| heightMm | Int | tak | - | - |
| loadWidthMm | Int | tak | 0 | - |
| loadDepthMm | Int | tak | 6000 | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

### ProfileDepth
**Tabela:** `profile_depths`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| profileType | String | tak | - | @unique |
| depthMm | Int | tak | - | - |
| description | String | - | - | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

### ProfilePalletConfig
**Tabela:** `profile_pallet_configs`
> Przelicznik: ile beli profilu mieści się w jednej palecie Schuco

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| profileId | Int | tak | - | @unique, FK |
| beamsPerPallet | Int | tak | - | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `profile` -> Profile (many-to-one)

### PackingRule
**Tabela:** `packing_rules`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| name | String | tak | - | - |
| description | String | - | - | - |
| isActive | Boolean | tak | true | - |
| ruleConfig | String | tak | - | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

### PalletOptimization
**Tabela:** `pallet_optimizations`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| deliveryId | Int | tak | - | @unique, FK |
| totalPallets | Int | tak | - | - |
| optimizationData | String | tak | - | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |
| validationStatus | String | - | pending | P0-R2: Physical validation status 'pending' - awaiting validation, 'valid' - validated OK, 'invalid' - validation failed |
| validatedAt | DateTime | - | - | - |
| validationErrors | String | - | - | - |

**Relacje:**
- `pallets` -> OptimizedPallet[] (one-to-many)
- `delivery` -> Delivery (many-to-one)

### OptimizedPallet
**Tabela:** `optimized_pallets`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| optimizationId | Int | tak | - | FK |
| palletNumber | Int | tak | - | - |
| palletTypeName | String | tak | - | - |
| palletWidth | Int | tak | - | - |
| usedDepthMm | Int | tak | - | - |
| maxDepthMm | Int | tak | - | - |
| utilizationPercent | Float | tak | - | - |
| windowsData | String | tak | - | - |

**Relacje:**
- `optimization` -> PalletOptimization (many-to-one)

**Indeksy:**
- `@@index([optimizationId])`

### FileImport
**Tabela:** `file_imports` | **Soft Delete:** tak (deletedAt)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| filename | String | tak | - | - |
| filepath | String | tak | - | - |
| fileType | String | tak | - | - |
| status | String | tak | pending | - |
| processedAt | DateTime | - | - | - |
| errorMessage | String | - | - | - |
| metadata | String | - | - | - |
| deletedAt | DateTime | - | - | Soft delete |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `glassDeliveries` -> GlassDelivery[] (one-to-many)
- `pendingOrderPrices` -> PendingOrderPrice[] (one-to-many)

**Indeksy:**
- `@@index([status])`
- `@@index([createdAt])`
- `@@index([status, createdAt])`
- `@@index([deletedAt])`

### Setting
**Tabela:** `settings`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| key | String | tak | - | @id |
| value | String | tak | - | - |
| updatedAt | DateTime | tak | - | @updatedAt |

### Note
**Tabela:** `notes`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| orderId | Int | - | - | FK |
| content | String | tak | - | - |
| createdAt | DateTime | tak | now() | - |
| createdById | Int | - | - | FK |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `createdBy` -> User (many-to-one)
- `order` -> Order (many-to-one)

**Indeksy:**
- `@@index([orderId])`
- `@@index([createdById])`

### WorkingDay
**Tabela:** `working_days`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| date | DateTime | tak | - | @unique |
| isWorking | Boolean | tak | true | - |
| description | String | - | - | - |
| isHoliday | Boolean | tak | false | - |
| country | String | - | - | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Indeksy:**
- `@@index([isWorking, date])`

### SchucoDelivery
**Tabela:** `schuco_deliveries`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| orderDate | String | tak | - | - |
| orderNumber | String | tak | - | @unique |
| projectNumber | String | tak | - | - |
| orderName | String | tak | - | - |
| shippingStatus | String | tak | - | - |
| deliveryWeek | String | - | - | - |
| deliveryDate | DateTime | - | - | Sparsowana data dostawy (poniedziałek tygodnia) |
| deliveryType | String | - | - | - |
| tracking | String | - | - | - |
| complaint | String | - | - | - |
| orderType | String | - | - | - |
| totalAmount | String | - | - | - |
| rawData | String | - | - | - |
| fetchedAt | DateTime | tak | now() | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |
| orderDateParsed | DateTime | - | - | - |
| changeType | String | - | - | - |
| changedAt | DateTime | - | - | - |
| changedFields | String | - | - | - |
| previousValues | String | - | - | - |
| isWarehouseItem | Boolean | tak | false | - |
| extractedOrderNums | String | - | - | - |
| archivedAt | DateTime | - | - | Data archiwizacji - zrealizowane zamówienia > 3 miesiące |
| itemsFetchedAt | DateTime | - | - | Kiedy ostatnio pobrano pozycje zamówienia |

**Relacje:**
- `orderLinks` -> OrderSchucoLink[] (one-to-many)
- `items` -> SchucoOrderItem[] (one-to-many)

**Indeksy:**
- `@@index([fetchedAt])`
- `@@index([itemsFetchedAt])`
- `@@index([archivedAt])`
- `@@index([orderNumber])`
- `@@index([orderDate])`
- `@@index([orderDateParsed])`
- `@@index([changeType])`
- `@@index([changedAt])`
- `@@index([changeType, changedAt])`
- `@@index([orderDateParsed, shippingStatus])`
- `@@index([shippingStatus, orderDateParsed])`
- `@@index([isWarehouseItem])`
- `@@index([orderNumber, fetchedAt])`
- `@@index([deliveryDate])`

### SchucoFetchLog
**Tabela:** `schuco_fetch_logs`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| status | String | tak | - | - |
| triggerType | String | tak | manual | - |
| recordsCount | Int | - | - | - |
| newRecords | Int | - | - | - |
| updatedRecords | Int | - | - | - |
| unchangedRecords | Int | - | - | - |
| errorMessage | String | - | - | - |
| startedAt | DateTime | tak | now() | - |
| completedAt | DateTime | - | - | - |
| durationMs | Int | - | - | - |

**Indeksy:**
- `@@index([startedAt])`
- `@@index([triggerType])`

### GmailFetchLog
**Tabela:** `gmail_fetch_logs`
> Gmail IMAP - log pobierania załączników CSV z maili

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| messageUid | String | tak | - | - |
| subject | String | - | - | - |
| sender | String | - | - | - |
| receivedAt | DateTime | - | - | - |
| attachmentName | String | - | - | - |
| savedFilePath | String | - | - | - |
| status | String | tak | pending | pending / downloaded / failed |
| errorMessage | String | - | - | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Indeksy:**
- `@@unique([messageUid])`
- `@@index([status])`
- `@@index([createdAt])`

### SchucoOrderItem
**Tabela:** `schuco_order_items`
> Pozycje zamówienia Schüco - artykuły w zamówieniu

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| schucoDeliveryId | Int | tak | - | FK |
| position | Int | tak | - | Pozycja w zamówieniu (1, 2, 3...) |
| articleNumber | String | tak | - | Nr artykułu (np. 19411460) |
| articleDescription | String | tak | - | Opis artykułu |
| orderedQty | Int | tak | - | Zamówiona ilość |
| shippedQty | Int | tak | - | Wysłana ilość |
| unit | String | tak | szt. | Jednostka |
| dimensions | String | - | - | Wymiary (np. 6000 mm) |
| configuration | String | - | - | Konfiguracja |
| deliveryWeek | String | - | - | Tydzień dostawy (np. 2026/7) |
| deliveryDate | DateTime | - | - | Sparsowana data dostawy (poniedziałek tygodnia) |
| tracking | String | - | - | Śledzenie |
| comment | String | - | - | Komentarz |
| changeType | String | - | - | Change tracking "new" / "updated" / null |
| changedAt | DateTime | - | - | - |
| changedFields | String | - | - | JSON array pól które się zmieniły |
| previousValues | String | - | - | JSON poprzednie wartości |
| fetchedAt | DateTime | tak | now() | Timestamps |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `schucoDelivery` -> SchucoDelivery (many-to-one)

**Indeksy:**
- `@@unique([schucoDeliveryId, position])`
- `@@index([schucoDeliveryId])`
- `@@index([articleNumber])`
- `@@index([changeType, changedAt])`
- `@@index([deliveryDate])`

### MonthlyReport
**Tabela:** `monthly_reports`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| year | Int | tak | - | - |
| month | Int | tak | - | - |
| reportDate | DateTime | tak | now() | - |
| totalOrders | Int | tak | 0 | - |
| totalWindows | Int | tak | 0 | - |
| totalSashes | Int | tak | 0 | - |
| totalValuePln | Int | tak | 0 | - |
| totalValueEur | Int | tak | 0 | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `reportItems` -> MonthlyReportItem[] (one-to-many)

**Indeksy:**
- `@@unique([year, month])`
- `@@index([reportDate])`

### MonthlyReportItem
**Tabela:** `monthly_report_items`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| reportId | Int | tak | - | FK |
| orderId | Int | tak | - | FK |
| orderNumber | String | tak | - | - |
| invoiceNumber | String | - | - | - |
| windowsCount | Int | tak | 0 | - |
| sashesCount | Int | tak | 0 | - |
| unitsCount | Int | tak | 0 | - |
| valuePln | Int | - | - | - |
| valueEur | Int | - | - | - |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `order` -> Order (many-to-one)
- `report` -> MonthlyReport (many-to-one)

**Indeksy:**
- `@@index([reportId])`
- `@@index([orderId])`

### CurrencyConfig
**Tabela:** `currency_config`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| eurToPlnRate | Int | tak | - | - |
| effectiveDate | DateTime | tak | now() | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Indeksy:**
- `@@index([effectiveDate])`

### GlassDelivery
**Tabela:** `glass_deliveries`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| rackNumber | String | tak | - | - |
| customerOrderNumber | String | tak | - | - |
| supplierOrderNumber | String | - | - | - |
| deliveryDate | DateTime | tak | - | - |
| fileImportId | Int | - | - | FK |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `fileImport` -> FileImport (many-to-one)
- `items` -> GlassDeliveryItem[] (one-to-many)
- `looseGlasses` -> LooseGlass[] (one-to-many)
- `aluminumGlasses` -> AluminumGlass[] (one-to-many)
- `reclamationGlasses` -> ReclamationGlass[] (one-to-many)

**Indeksy:**
- `@@index([deliveryDate])`
- `@@index([customerOrderNumber])`
- `@@index([rackNumber])`
- `@@index([fileImportId])`

### GlassDeliveryItem
**Tabela:** `glass_delivery_items`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| glassDeliveryId | Int | tak | - | FK |
| glassOrderId | Int | - | - | FK |
| orderNumber | String | tak | - | - |
| orderSuffix | String | - | - | - |
| position | String | tak | - | - |
| widthMm | Int | tak | - | - |
| heightMm | Int | tak | - | - |
| quantity | Int | tak | - | - |
| glassComposition | String | - | - | - |
| serialNumber | String | - | - | - |
| clientCode | String | - | - | - |
| matchStatus | String | tak | pending | - |
| matchedItemId | Int | - | - | FK |
| customerOrderNumber | String | - | - | Numer zamówienia klienta (z wiersza CSV) - może różnić się od parent GlassDelivery |
| rackNumber | String | - | - | Numer stojaka (z wiersza CSV) - może różnić się od parent GlassDelivery |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `glassOrder` -> GlassOrder (many-to-one)
- `glassDelivery` -> GlassDelivery (many-to-one)

**Indeksy:**
- `@@index([glassDeliveryId, orderNumber, position])`
- `@@index([widthMm, heightMm])`
- `@@index([matchStatus])`
- `@@index([orderNumber, orderSuffix])`
- `@@index([orderNumber])`
- `@@index([glassDeliveryId])`
- `@@index([customerOrderNumber])`

### GlassOrderItem
**Tabela:** `glass_order_items`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| glassOrderId | Int | tak | - | FK |
| orderNumber | String | tak | - | - |
| orderSuffix | String | - | - | - |
| position | String | tak | - | - |
| glassType | String | tak | - | - |
| widthMm | Int | tak | - | - |
| heightMm | Int | tak | - | - |
| quantity | Int | tak | - | - |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `glassOrder` -> GlassOrder (many-to-one)

**Indeksy:**
- `@@index([glassOrderId, orderNumber, position])`
- `@@index([widthMm, heightMm])`
- `@@index([orderNumber, orderSuffix])`
- `@@index([orderNumber])`
- `@@index([glassOrderId])`

### GlassOrderValidation
**Tabela:** `glass_order_validations`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| glassOrderId | Int | - | - | FK |
| orderNumber | String | tak | - | - |
| validationType | String | tak | - | - |
| severity | String | tak | - | - |
| expectedQuantity | Int | - | - | - |
| orderedQuantity | Int | - | - | - |
| deliveredQuantity | Int | - | - | - |
| message | String | tak | - | - |
| details | String | - | - | - |
| resolved | Boolean | tak | false | - |
| resolvedAt | DateTime | - | - | - |
| resolvedBy | String | - | - | - |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `glassOrder` -> GlassOrder (many-to-one)

**Indeksy:**
- `@@index([resolved])`
- `@@index([severity])`
- `@@index([orderNumber])`
- `@@index([glassOrderId])`

### GlassOrder
**Tabela:** `glass_orders` | **Soft Delete:** tak (deletedAt)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| glassOrderNumber | String | tak | - | @unique |
| orderDate | DateTime | tak | - | - |
| supplier | String | tak | - | - |
| orderedBy | String | - | - | - |
| expectedDeliveryDate | DateTime | - | - | - |
| actualDeliveryDate | DateTime | - | - | - |
| status | String | tak | ordered | - |
| notes | String | - | - | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |
| deletedAt | DateTime | - | - | - |

**Relacje:**
- `deliveryItems` -> GlassDeliveryItem[] (one-to-many)
- `items` -> GlassOrderItem[] (one-to-many)
- `validationResults` -> GlassOrderValidation[] (one-to-many)

**Indeksy:**
- `@@index([expectedDeliveryDate])`
- `@@index([status])`
- `@@index([orderDate])`
- `@@index([deletedAt])`

### OrderSchucoLink
**Tabela:** `order_schuco_links`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| orderId | Int | tak | - | FK |
| schucoDeliveryId | Int | tak | - | FK |
| linkedAt | DateTime | tak | now() | - |
| linkedBy | String | - | - | - |

**Relacje:**
- `order` -> Order (many-to-one)
- `schucoDelivery` -> SchucoDelivery (many-to-one)

**Indeksy:**
- `@@unique([orderId, schucoDeliveryId])`
- `@@index([orderId])`
- `@@index([schucoDeliveryId])`

### UserFolderSettings
**Tabela:** `user_folder_settings`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| userId | Int | - | - | @unique, FK |
| importsBasePath | String | tak | - | - |
| isActive | Boolean | tak | true | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `user` -> User (many-to-one)

**Indeksy:**
- `@@index([userId, isActive])`

### ImportLock
**Tabela:** `import_locks`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| folderPath | String | tak | - | @unique |
| userId | Int | tak | - | FK |
| lockedAt | DateTime | tak | now() | - |
| expiresAt | DateTime | tak | - | - |
| processId | String | - | - | FK |

**Relacje:**
- `user` -> User (many-to-one)

**Indeksy:**
- `@@index([expiresAt])`
- `@@index([userId])`

### PendingOrderPrice
**Tabela:** `pending_order_prices`
> Ceny profili oczekujące na powiązanie ze zleceniem Gdy importujemy PDF z ceną ale zlecenie jeszcze nie istnieje, zapisujemy tu cenę i automatycznie przypisujemy gdy zlecenie się pojawi

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| orderNumber | String | tak | - | - |
| reference | String | - | - | - |
| currency | String | tak | - | EUR lub PLN |
| valueNetto | Int | tak | - | - |
| valueBrutto | Int | - | - | - |
| filename | String | tak | - | oryginalny nazwa pliku PDF |
| filepath | String | tak | - | ścieżka do pliku |
| importId | Int | - | - | FK |
| status | String | tak | pending | pending, applied, expired |
| appliedAt | DateTime | - | - | - |
| appliedToOrderId | Int | - | - | FK |
| expiresAt | DateTime | - | - | optional TTL - when this record should be cleaned up |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `fileImport` -> FileImport (many-to-one)

**Indeksy:**
- `@@index([orderNumber])`
- `@@index([status])`
- `@@index([orderNumber, status])`
- `@@index([expiresAt])`
- `@@index([status, expiresAt])`
- `@@index([status, appliedAt])`

### OkucLocation
**Tabela:** `okuc_locations` | **Soft Delete:** tak (deletedAt)
> Lokalizacje magazynowe dla okuć (edytowalne w ustawieniach)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| name | String | tak | - | @unique, "Schuco", "Namiot", "Hala skrzydła", etc. |
| sortOrder | Int | tak | 0 | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |
| deletedAt | DateTime | - | - | Soft delete |

**Relacje:**
- `articles` -> OkucArticle[] (one-to-many)

**Indeksy:**
- `@@index([deletedAt])`
- `@@index([sortOrder])`

### OkucArticle
**Tabela:** `okuc_articles` | **Soft Delete:** tak (deletedAt)
> Artykuł okuciowy - podstawowa jednostka w systemie

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| articleId | String | tak | - | @unique, FK, Numer artykułu (np. "A123") |
| name | String | tak | - | - |
| description | String | - | - | - |
| usedInPvc | Boolean | tak | false | Klasyfikacja |
| usedInAlu | Boolean | tak | false | - |
| orderClass | String | tak | typical | 'typical' / 'atypical' |
| sizeClass | String | tak | standard | 'standard' / 'gabarat' |
| orderUnit | String | tak | piece | Jednostki i opakowania 'piece' / 'pack' |
| packagingSizes | String | - | - | JSON: [50, 100] |
| preferredSize | Int | - | - | - |
| supplierCode | String | - | - | Dane dostawcy |
| leadTimeDays | Int | tak | 14 | - |
| safetyDays | Int | tak | 3 | - |
| priceEur | Int | - | - | Cena w eurocentach (np. 200 = 2,00 EUR) |
| locationId | Int | - | - | FK, Lokalizacja magazynowa |
| isPhaseOut | Boolean | tak | false | Zastępstwa artykułów (wygaszanie) Artykuł wygaszany - nie zamawiaj |
| replacedByArticleId | Int | - | - | FK, FK do artykułu zastępującego |
| demandTransferredAt | DateTime | - | - | Data przeniesienia zapotrzebowania |
| createdAt | DateTime | tak | now() | Audit |
| updatedAt | DateTime | tak | - | @updatedAt |
| deletedAt | DateTime | - | - | - |

**Relacje:**
- `location` -> OkucLocation (many-to-one)
- `aliases` -> OkucArticleAlias[] (one-to-many)
- `proportionsSource` -> OkucProportion[] (one-to-many)
- `proportionsTarget` -> OkucProportion[] (one-to-many)
- `stocks` -> OkucStock[] (one-to-many)
- `demands` -> OkucDemand[] (one-to-many)
- `orderItems` -> OkucOrderItem[] (one-to-many)
- `historyEntries` -> OkucHistory[] (one-to-many)
- `replacedByArticle` -> OkucArticle (many-to-one)
- `replacesArticles` -> OkucArticle[] (one-to-many)

**Indeksy:**
- `@@index([usedInPvc])`
- `@@index([usedInAlu])`
- `@@index([orderClass, sizeClass])`
- `@@index([deletedAt])`
- `@@index([locationId])`
- `@@index([isPhaseOut])`
- `@@index([replacedByArticleId])`

### OkucArticleAlias
**Tabela:** `okuc_article_aliases`
> System aliasów - mapowanie starych numerów na nowe

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| articleId | Int | tak | - | FK |
| aliasNumber | String | tak | - | @unique, Stary numer |
| isActive | Boolean | tak | true | false gdy zapas zszedł do 0 |
| deactivatedAt | DateTime | - | - | - |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `article` -> OkucArticle (many-to-one)

**Indeksy:**
- `@@index([aliasNumber])`
- `@@index([isActive])`
- `@@index([articleId])`

### OkucProportion
**Tabela:** `okuc_proportions` | **Soft Delete:** tak (deletedAt)
> Proporcje między artykułami (multiplier/split)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| sourceArticleId | Int | tak | - | FK |
| targetArticleId | Int | tak | - | FK |
| proportionType | String | tak | - | 'multiplier' / 'split' |
| ratio | Float | tak | 1.0 | np. 2.0 oznacza 2x target na 1x source |
| splitPercent | Float | - | - | dla typu 'split' (0-100) |
| tolerance | Float | tak | 0.9 | tolerancja proporcji (np. 90%) |
| isActive | Boolean | tak | true | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |
| deletedAt | DateTime | - | - | - |

**Relacje:**
- `sourceArticle` -> OkucArticle (many-to-one)
- `targetArticle` -> OkucArticle (many-to-one)

**Indeksy:**
- `@@unique([sourceArticleId, targetArticleId])`
- `@@index([sourceArticleId])`
- `@@index([targetArticleId])`
- `@@index([isActive])`
- `@@index([deletedAt])`

### OkucStock
**Tabela:** `okuc_stocks`
> Stan magazynowy okuć (PVC: 3 podmagazyny, ALU: jeden magazyn)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| articleId | Int | tak | - | FK |
| warehouseType | String | tak | - | 'pvc' / 'alu' |
| subWarehouse | String | - | - | 'production' / 'buffer' / 'gabaraty' (tylko PVC) |
| currentQuantity | Int | tak | 0 | - |
| initialQuantity | Int | - | - | Stan początkowy (remanent) |
| isQuantityUncertain | Boolean | tak | false | Czy ilość jest niepewna (szare tło w raporcie) |
| reservedQty | Int | tak | 0 | - |
| minStock | Int | - | - | - |
| maxStock | Int | - | - | - |
| version | Int | tak | 0 | Optimistic locking |
| updatedAt | DateTime | tak | - | @updatedAt |
| updatedById | Int | - | - | FK |

**Relacje:**
- `article` -> OkucArticle (many-to-one)
- `updatedBy` -> User (many-to-one)

**Indeksy:**
- `@@unique([articleId, warehouseType, subWarehouse])`
- `@@index([warehouseType])`
- `@@index([subWarehouse])`
- `@@index([articleId])`

### OkucDemand
**Tabela:** `okuc_demands` | **Soft Delete:** tak (deletedAt)
> Zapotrzebowanie na okucia (z CSV lub zleceń)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| demandId | String | - | - | @unique, FK, ID z CSV importu (np. ZAP-2025-0089) |
| articleId | Int | tak | - | FK |
| orderId | Int | - | - | FK, Powiązanie ze zleceniem (opcjonalne) |
| expectedWeek | String | tak | - | Format: "2025-W02" |
| quantity | Int | tak | - | - |
| status | String | tak | pending | 'pending' / 'confirmed' / 'in_production' / 'completed' / 'cancelled' |
| source | String | tak | order | 'order' / 'csv_import' |
| isManualEdit | Boolean | tak | false | Audit edycji ręcznej |
| editedAt | DateTime | - | - | - |
| editedById | Int | - | - | FK |
| editReason | String | - | - | - |
| createdAt | DateTime | tak | now() | Timestamps |
| updatedAt | DateTime | tak | - | @updatedAt |
| deletedAt | DateTime | - | - | - |

**Relacje:**
- `article` -> OkucArticle (many-to-one)
- `order` -> Order (many-to-one)

**Indeksy:**
- `@@index([articleId])`
- `@@index([expectedWeek])`
- `@@index([status])`
- `@@index([orderId])`
- `@@index([source])`
- `@@index([expectedWeek, status])`
- `@@index([deletedAt])`

### OkucOrder
**Tabela:** `okuc_orders` | **Soft Delete:** tak (deletedAt)
> Zamówienie do dostawcy okuć

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| orderNumber | String | tak | - | @unique |
| basketType | String | tak | - | 'typical_standard' / 'typical_gabarat' / 'atypical' |
| status | String | tak | draft | 'draft' / 'pending' / 'ordered' / 'in_transit' / 'received' / 'cancelled' |
| expectedDeliveryDate | DateTime | - | - | - |
| actualDeliveryDate | DateTime | - | - | - |
| notes | String | - | - | - |
| isManualEdit | Boolean | tak | false | Audit edycji ręcznej |
| editedAt | DateTime | - | - | - |
| editedById | Int | - | - | FK |
| editReason | String | - | - | - |
| createdAt | DateTime | tak | now() | Timestamps |
| createdById | Int | - | - | FK |
| updatedAt | DateTime | tak | - | @updatedAt |
| deletedAt | DateTime | - | - | - |

**Relacje:**
- `items` -> OkucOrderItem[] (one-to-many)
- `createdBy` -> User (many-to-one)

**Indeksy:**
- `@@index([basketType])`
- `@@index([status])`
- `@@index([expectedDeliveryDate])`
- `@@index([status, basketType])`
- `@@index([deletedAt])`

### OkucOrderItem
**Tabela:** `okuc_order_items`
> Pozycja zamówienia okuć

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| okucOrderId | Int | tak | - | FK |
| articleId | Int | tak | - | FK |
| orderedQty | Int | tak | - | - |
| receivedQty | Int | - | - | - |
| unitPrice | Int | - | - | Cena w groszach |

**Relacje:**
- `okucOrder` -> OkucOrder (many-to-one)
- `article` -> OkucArticle (many-to-one)

**Indeksy:**
- `@@unique([okucOrderId, articleId])`
- `@@index([okucOrderId])`
- `@@index([articleId])`

### OkucHistory
**Tabela:** `okuc_history`
> Historia zmian magazynowych okuć (RW, korekty, zwroty, remanent)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| articleId | Int | tak | - | FK |
| warehouseType | String | tak | - | 'pvc' / 'alu' |
| subWarehouse | String | - | - | - |
| eventType | String | tak | - | 'rw' / 'manual_consumption' / 'adjustment' / 'return' / 'inventory_count' / 'transfer' / 'order_received' |
| previousQty | Int | tak | - | - |
| changeQty | Int | tak | - | Może być ujemna |
| newQty | Int | tak | - | - |
| reason | String | - | - | Wymagane dla adjustment i manual_consumption |
| reference | String | - | - | RW number, Order ID, itp. |
| isManualEdit | Boolean | tak | false | Audit edycji ręcznej |
| editedAt | DateTime | - | - | - |
| editedById | Int | - | - | FK |
| recordedAt | DateTime | tak | now() | Timestamps |
| recordedById | Int | - | - | FK |

**Relacje:**
- `article` -> OkucArticle (many-to-one)
- `recordedBy` -> User (many-to-one)
- `editedBy` -> User (many-to-one)

**Indeksy:**
- `@@index([articleId])`
- `@@index([eventType])`
- `@@index([recordedAt])`
- `@@index([warehouseType])`
- `@@index([warehouseType, subWarehouse])`
- `@@index([isManualEdit])`

### LooseGlass
**Tabela:** `loose_glasses`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| glassDeliveryId | Int | tak | - | FK |
| customerOrderNumber | String | tak | - | - |
| clientName | String | - | - | - |
| widthMm | Int | tak | - | - |
| heightMm | Int | tak | - | - |
| quantity | Int | tak | - | - |
| orderNumber | String | tak | - | - |
| glassComposition | String | - | - | - |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `glassDelivery` -> GlassDelivery (many-to-one)

**Indeksy:**
- `@@index([customerOrderNumber])`
- `@@index([clientName])`
- `@@index([orderNumber])`
- `@@index([glassDeliveryId])`

### AluminumGlass
**Tabela:** `aluminum_glasses`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| glassDeliveryId | Int | tak | - | FK |
| customerOrderNumber | String | tak | - | - |
| clientName | String | - | - | - |
| widthMm | Int | tak | - | - |
| heightMm | Int | tak | - | - |
| quantity | Int | tak | - | - |
| orderNumber | String | tak | - | - |
| glassComposition | String | - | - | - |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `glassDelivery` -> GlassDelivery (many-to-one)

**Indeksy:**
- `@@index([customerOrderNumber])`
- `@@index([clientName])`
- `@@index([orderNumber])`
- `@@index([glassDeliveryId])`

### ReclamationGlass
**Tabela:** `reclamation_glasses`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| glassDeliveryId | Int | tak | - | FK |
| customerOrderNumber | String | tak | - | - |
| clientName | String | - | - | - |
| widthMm | Int | tak | - | - |
| heightMm | Int | tak | - | - |
| quantity | Int | tak | - | - |
| orderNumber | String | tak | - | - |
| glassComposition | String | - | - | - |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `glassDelivery` -> GlassDelivery (many-to-one)

**Indeksy:**
- `@@index([customerOrderNumber])`
- `@@index([clientName])`
- `@@index([orderNumber])`
- `@@index([glassDeliveryId])`

### AkrobudVerificationList
**Tabela:** `akrobud_verification_lists` | **Soft Delete:** tak (deletedAt)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| deliveryDate | DateTime | tak | - | - |
| deliveryId | Int | - | - | FK |
| title | String | - | - | - |
| notes | String | - | - | - |
| status | String | tak | draft | draft / verified / applied |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |
| deletedAt | DateTime | - | - | - |
| version | Int | tak | 1 | Wersjonowanie list Numer wersji listy (v1, v2, v3...) |
| parentId | Int | - | - | FK, ID poprzedniej wersji |
| rawInput | String | - | - | Oryginalny tekst maila |
| suggestedDate | DateTime | - | - | Wykryta data z "na DD.MM" |

**Relacje:**
- `delivery` -> Delivery (many-to-one)
- `items` -> AkrobudVerificationItem[] (one-to-many)
- `parent` -> AkrobudVerificationList (many-to-one)
- `children` -> AkrobudVerificationList[] (one-to-many)

**Indeksy:**
- `@@index([deliveryDate])`
- `@@index([deletedAt])`
- `@@index([status])`
- `@@index([parentId])`
- `@@index([version])`

### AkrobudVerificationItem
**Tabela:** `akrobud_verification_items`

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| listId | Int | tak | - | FK |
| orderNumberInput | String | tak | - | Legacy: numer zlecenia |
| orderNumberBase | String | - | - | Legacy |
| orderNumberSuffix | String | - | - | Legacy |
| matchedOrderId | Int | - | - | FK, Legacy: pojedyncze zlecenie |
| matchStatus | String | tak | pending | pending / found / not_found / variant_match |
| position | Int | tak | - | - |
| createdAt | DateTime | tak | now() | - |
| projectNumber | String | - | - | Nowe pola dla projektów Numer projektu (np. "D3455") |

**Relacje:**
- `list` -> AkrobudVerificationList (many-to-one)
- `matchedOrder` -> Order (many-to-one)
- `matchedOrders` -> VerificationItemOrder[] (one-to-many)

**Indeksy:**
- `@@unique([listId, orderNumberInput])`
- `@@index([listId])`
- `@@index([matchStatus])`
- `@@index([projectNumber])`

### VerificationItemOrder
**Tabela:** `verification_item_orders`
> Tabela łącząca projekty z zleceniami (relacja N:M)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| itemId | Int | tak | - | FK |
| orderId | Int | tak | - | FK |

**Relacje:**
- `item` -> AkrobudVerificationItem (many-to-one)
- `order` -> Order (many-to-one)

**Indeksy:**
- `@@unique([itemId, orderId])`
- `@@index([itemId])`
- `@@index([orderId])`

### Worker
**Tabela:** `workers`
> Pracownik produkcyjny

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| firstName | String | tak | - | - |
| lastName | String | tak | - | - |
| defaultPosition | String | tak | - | Domyślne stanowisko |
| isActive | Boolean | tak | true | - |
| sortOrder | Int | tak | 0 | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `timeEntries` -> TimeEntry[] (one-to-many)

**Indeksy:**
- `@@index([isActive])`
- `@@index([sortOrder])`

### Position
**Tabela:** `positions`
> Stanowisko pracy (słownik edytowalny)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| name | String | tak | - | @unique, "Cięcie", "Zbrojenie", "Spawanie", etc. |
| shortName | String | - | - | Skrócona nazwa do wyświetlania |
| sortOrder | Int | tak | 0 | - |
| isActive | Boolean | tak | true | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `timeEntries` -> TimeEntry[] (one-to-many)

**Indeksy:**
- `@@index([isActive])`
- `@@index([sortOrder])`

### NonProductiveTaskType
**Tabela:** `non_productive_task_types`
> Typ zadania nieprodukcyjnego (słownik edytowalny)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| name | String | tak | - | @unique, "Serwis", "Pakowanie", "Przygotowywanie profili", etc. |
| sortOrder | Int | tak | 0 | - |
| isActive | Boolean | tak | true | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `tasks` -> NonProductiveTask[] (one-to-many)

**Indeksy:**
- `@@index([isActive])`
- `@@index([sortOrder])`

### TimeEntry
**Tabela:** `time_entries`
> Wpis godzinowy pracownika na dany dzień

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| date | DateTime | tak | - | Data wpisu (przechowywana jako DateTime, używana jako Date) |
| workerId | Int | tak | - | FK |
| positionId | Int | tak | - | FK, Stanowisko w tym dniu |
| productiveHours | Float | tak | 0 | Godziny produktywne (0.0 - 24.0) |
| absenceType | String | - | - | Typ nieobecności: "SICK" / "VACATION" / "ABSENT" / null |
| notes | String | - | - | Notatki do wpisu |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `worker` -> Worker (many-to-one)
- `position` -> Position (many-to-one)
- `nonProductiveTasks` -> NonProductiveTask[] (one-to-many)
- `specialWorks` -> SpecialWork[] (one-to-many)

**Indeksy:**
- `@@unique([date, workerId])`
- `@@index([date])`
- `@@index([workerId])`
- `@@index([positionId])`
- `@@index([absenceType])`

### NonProductiveTask
**Tabela:** `non_productive_tasks`
> Zadanie nieprodukcyjne przypisane do wpisu godzinowego

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| timeEntryId | Int | tak | - | FK |
| taskTypeId | Int | tak | - | FK |
| hours | Float | tak | - | Godziny (0.0 - 24.0) |
| notes | String | - | - | Opcjonalne notatki |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `timeEntry` -> TimeEntry (many-to-one)
- `taskType` -> NonProductiveTaskType (many-to-one)

**Indeksy:**
- `@@index([timeEntryId])`
- `@@index([taskTypeId])`

### SpecialWorkType
**Tabela:** `special_work_types`
> Typ nietypówki (słownik edytowalny) - Drzwi, HS, PSK, szprosy, trapez

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| name | String | tak | - | @unique, "Drzwi", "HS", "PSK", etc. |
| shortName | String | - | - | - |
| sortOrder | Int | tak | 0 | - |
| isActive | Boolean | tak | true | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `specialWorks` -> SpecialWork[] (one-to-many)

**Indeksy:**
- `@@index([isActive])`
- `@@index([sortOrder])`

### SpecialWork
**Tabela:** `special_works`
> Nietypówka przypisana do wpisu godzinowego

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| timeEntryId | Int | tak | - | FK |
| specialTypeId | Int | tak | - | FK |
| hours | Float | tak | - | Godziny (0.0 - 24.0) |
| notes | String | - | - | Opcjonalne notatki |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `timeEntry` -> TimeEntry (many-to-one)
- `specialType` -> SpecialWorkType (many-to-one)

**Indeksy:**
- `@@index([timeEntryId])`
- `@@index([specialTypeId])`

### PalletStockDay
**Tabela:** `pallet_stock_days`
> Dzień paletowy - główna encja modułu

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| date | DateTime | tak | - | @unique, Data (tylko dzień, bez czasu) |
| status | String | tak | OPEN | 'OPEN' / 'CLOSED' |
| closedAt | DateTime | - | - | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `entries` -> PalletStockEntry[] (one-to-many)

**Indeksy:**
- `@@index([date])`
- `@@index([status])`

### PalletStockEntry
**Tabela:** `pallet_stock_entries`
> Wpis dla typu palety w danym dniu

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| palletDayId | Int | tak | - | FK |
| type | String | tak | - | 'MALA' / 'P2400' / 'P3000' / 'P3500' / 'P4000' |
| morningStock | Int | tak | 0 | Stan poranny |
| morningCorrected | Boolean | tak | false | Czy była korekta |
| morningNote | String | - | - | Komentarz do korekty (wymagany gdy corrected=true) |
| used | Int | tak | 0 | Użyte w ciągu dnia |
| produced | Int | tak | 0 | Zrobione wieczorem |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `palletDay` -> PalletStockDay (many-to-one)

**Indeksy:**
- `@@unique([palletDayId, type])`
- `@@index([type])`

### PalletAlertConfig
**Tabela:** `pallet_alert_configs`
> Konfiguracja alertów (progi krytyczne per typ palety)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| type | String | tak | - | @unique, 'MALA' / 'P2400' / 'P3000' / 'P3500' / 'P4000' |
| criticalThreshold | Int | tak | 10 | Próg alertu |
| updatedAt | DateTime | tak | - | @updatedAt |

### PalletInitialStock
**Tabela:** `pallet_initial_stocks`
> Stan początkowy palet - jeden rekord globalny określający od kiedy liczymy i ile było na start

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| startDate | DateTime | tak | - | Data od której system liczy (wspólna dla wszystkich typów) |
| type | String | tak | - | @unique, 'MALA' / 'P2400' / 'P3000' / 'P3500' / 'P4000' |
| initialStock | Int | tak | 0 | Początkowa ilość palet |
| updatedAt | DateTime | tak | - | @updatedAt |
| updatedById | Int | - | - | FK, Kto ostatnio modyfikował |

**Relacje:**
- `updatedBy` -> User (many-to-one)

### ProductionReport
**Tabela:** `production_reports`
> Główny raport miesięczny produkcji Zastępuje stary MonthlyReport - oparty o productionDate zamiast invoiceNumber

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| year | Int | tak | - | - |
| month | Int | tak | - | - |
| status | String | tak | open | Status zamknięcia: 'open' / 'closed' |
| closedAt | DateTime | - | - | - |
| closedById | Int | - | - | FK |
| editedAfterClose | Boolean | tak | false | Znacznik edycji po zamknięciu (bez pełnej historii) |
| reopenedAt | DateTime | - | - | - |
| reopenedById | Int | - | - | FK |
| atypicalWindows | Int | tak | 0 | Nietypówki (korekta raportowa - jedna globalna na miesiąc) |
| atypicalUnits | Int | tak | 0 | - |
| atypicalSashes | Int | tak | 0 | - |
| atypicalValuePln | Int | tak | 0 | w groszach |
| atypicalCurrency | String | tak | PLN | - |
| atypicalNotes | String | - | - | - |
| createdAt | DateTime | tak | now() | Audit timestamps |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `closedBy` -> User (many-to-one)
- `reopenedBy` -> User (many-to-one)
- `items` -> ProductionReportItem[] (one-to-many)

**Indeksy:**
- `@@unique([year, month])`
- `@@index([status])`

### ProductionReportItem
**Tabela:** `production_report_items`
> Pozycja raportu - nadpisane wartości dla zlecenia Tylko zlecenia z productionDate w danym miesiącu i status=completed

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| reportId | Int | tak | - | FK |
| orderId | Int | tak | - | FK |
| overrideWindows | Int | - | - | Nadpisane wartości (jeśli kierownik edytował) - NULL = użyj wartości z Order |
| overrideUnits | Int | - | - | - |
| overrideSashes | Int | - | - | - |
| overrideValuePln | Int | - | - | w groszach |
| overrideValueEur | Int | - | - | w centach |
| overrideMaterialValue | Int | - | - | w groszach (nadpisanie wartości materiału) |
| rwOkucia | Boolean | tak | false | Checkboxy RW (Rozchód Wewnętrzny - czy materiały wydane z magazynu) |
| rwProfile | Boolean | tak | false | - |
| verified | Boolean | tak | false | Weryfikacja - czy zlecenie zostało sprawdzone (blokuje dalszą edycję i import) Czy sprawdzone i zatwierdzone przez kierownika |
| invoiceNumber | String | - | - | Dane FV (edytowalne przez księgową nawet po zamknięciu miesiąca) |
| invoiceDate | DateTime | - | - | - |
| createdAt | DateTime | tak | now() | Audit timestamps |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `report` -> ProductionReport (many-to-one)
- `order` -> Order (many-to-one)

**Indeksy:**
- `@@unique([reportId, orderId])`
- `@@index([reportId])`
- `@@index([orderId])`

### PendingImportConflict
**Tabela:** `pending_import_conflicts`
> Konflikt importu - plik z wariantem zlecenia (np. 53455-b) gdy bazowe istnieje

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| orderNumber | String | tak | - | Dane zlecenia z pliku Pełny numer (np. "53455-b") |
| baseOrderNumber | String | tak | - | Bazowy numer (np. "53455") |
| suffix | String | tak | - | Sufiks (np. "b") |
| baseOrderId | Int | tak | - | FK, Powiązanie z bazowym zleceniem |
| documentAuthor | String | - | - | Powiązanie z autorem (pracownikiem) Nazwa autora z CSV |
| authorUserId | Int | - | - | FK, Przypisany user |
| filepath | String | tak | - | Plik źródłowy Ścieżka do skopiowanego pliku |
| filename | String | tak | - | Oryginalna nazwa pliku |
| parsedData | String | tak | - | Parsowane dane z CSV (JSON) - do porównania i późniejszego importu |
| existingWindowsCount | Int | - | - | Dane porównawcze (cache) |
| existingGlassCount | Int | - | - | - |
| newWindowsCount | Int | - | - | - |
| newGlassCount | Int | - | - | - |
| systemSuggestion | String | - | - | Sugestia systemu: 'replace_base' / 'keep_both' / 'manual' |
| status | String | tak | pending | Status: 'pending' / 'resolved' / 'cancelled' |
| resolution | String | - | - | Rozwiązanie: 'replaced' / 'kept_both' / 'cancelled' |
| resolvedAt | DateTime | - | - | - |
| resolvedById | Int | - | - | FK |
| createdAt | DateTime | tak | now() | Audit |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `baseOrder` -> Order (many-to-one)
- `authorUser` -> User (many-to-one)
- `resolvedBy` -> User (many-to-one)

**Indeksy:**
- `@@index([status])`
- `@@index([authorUserId])`
- `@@index([baseOrderId])`
- `@@index([createdAt])`
- `@@index([status, authorUserId])`

### ProductionEfficiencyConfig
**Tabela:** `production_efficiency_configs`
> Konfiguracja wydajności per typ klienta Wydajność bazowa: szkleń/h i skrzydeł/h przy pełnej obsadzie

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| clientType | String | tak | - | @unique, 'akrobud' / 'ct' / 'living' / 'other' |
| name | String | tak | - | Nazwa wyświetlana (np. "Akrobud", "CT", "Living") |
| glazingsPerHour | Decimal | tak | - | Wydajność bazowa Szkleń na godzinę produkcyjną |
| wingsPerHour | Decimal | tak | - | Skrzydeł na godzinę produkcyjną |
| coefficient | Decimal | tak | 1.0 | Współczynnik (1.0 = baza, <1.0 = wolniejsze, >1.0 = szybsze) Współczynnik wydajności |
| isActive | Boolean | tak | true | - |
| sortOrder | Int | tak | 0 | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

### ProductionCalendar
**Tabela:** `production_calendar`
> Kalendarz produkcyjny - dni wolne i soboty produkcyjne

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| date | DateTime | tak | - | @unique, Data (bez czasu) |
| dayType | String | tak | - | 'working' / 'holiday' / 'production_saturday' / 'custom_off' |
| description | String | - | - | Opis (np. "Nowy Rok", "Sobota produkcyjna") |
| maxHours | Decimal | - | - | Max godzin w tym dniu (null = domyślne) |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

### ProductionSettings
**Tabela:** `production_settings`
> Domyślne parametry planowania produkcji

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| key | String | tak | - | @unique, Klucz parametru |
| value | String | tak | - | Wartość (jako JSON string dla złożonych) |
| description | String | - | - | Opis parametru |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

### Steel
**Tabela:** `steels`
> Stal - wzmocnienie stalowe (bez kolorów, w odróżnieniu od profili PVC)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| number | String | tak | - | @unique, Numer stali bez końcowego "00" (np. "201202", "202617") |
| articleNumber | String | - | - | @unique, Pełny numer artykułu (np. "20120200") |
| name | String | tak | - | Nazwa (np. "Wzmocnienie 1.5 do ramy 8864") |
| description | String | - | - | - |
| sortOrder | Int | tak | 0 | - |
| createdAt | DateTime | tak | now() | - |
| updatedAt | DateTime | tak | - | @updatedAt |

**Relacje:**
- `steelStock` -> SteelStock[] (one-to-many)
- `steelOrders` -> SteelOrder[] (one-to-many)
- `steelHistory` -> SteelHistory[] (one-to-many)
- `orderSteelRequirements` -> OrderSteelRequirement[] (one-to-many)

### SteelStock
**Tabela:** `steel_stock` | **Soft Delete:** tak (deletedAt)
> Stan magazynowy stali (bez kolorów - jeden rekord na stal)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| steelId | Int | tak | - | @unique, FK |
| currentStockBeams | Int | tak | 0 | - |
| initialStockBeams | Int | tak | 0 | - |
| version | Int | tak | 0 | Optimistic locking |
| deletedAt | DateTime | - | - | - |
| updatedAt | DateTime | tak | - | @updatedAt |
| updatedById | Int | - | - | FK |

**Relacje:**
- `steel` -> Steel (many-to-one)
- `updatedBy` -> User (many-to-one)

**Indeksy:**
- `@@index([deletedAt])`

### SteelOrder
**Tabela:** `steel_orders`
> Zamówienie stali do dostawcy

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| steelId | Int | tak | - | FK |
| orderedBeams | Int | tak | - | - |
| expectedDeliveryDate | DateTime | tak | - | - |
| status | String | tak | pending | pending / ordered / delivered / cancelled |
| notes | String | - | - | - |
| createdAt | DateTime | tak | now() | - |
| createdById | Int | - | - | FK |

**Relacje:**
- `steel` -> Steel (many-to-one)
- `createdBy` -> User (many-to-one)

**Indeksy:**
- `@@unique([steelId, expectedDeliveryDate])`
- `@@index([status])`

### SteelHistory
**Tabela:** `steel_history`
> Historia zmian magazynowych stali

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| steelId | Int | tak | - | FK |
| calculatedStock | Int | tak | - | - |
| actualStock | Int | tak | - | - |
| difference | Int | tak | - | - |
| previousStock | Int | - | - | - |
| currentStock | Int | - | - | - |
| changeType | String | - | - | adjustment / inventory_count / order_received |
| notes | String | - | - | - |
| recordedAt | DateTime | tak | now() | - |
| recordedById | Int | - | - | FK |

**Relacje:**
- `steel` -> Steel (many-to-one)
- `recordedBy` -> User (many-to-one)

**Indeksy:**
- `@@index([steelId])`
- `@@index([recordedAt])`

### OrderSteelRequirement
**Tabela:** `order_steel_requirements`
> Zapotrzebowanie na stal z zamówienia produkcyjnego (analogicznie do OrderRequirement dla profili)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| orderId | Int | tak | - | FK |
| steelId | Int | tak | - | FK |
| beamsCount | Int | tak | - | - |
| meters | Float | tak | - | - |
| restMm | Int | tak | - | - |
| status | String | tak | pending | pending / completed (dla RW) |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `order` -> Order (many-to-one)
- `steel` -> Steel (many-to-one)

**Indeksy:**
- `@@unique([orderId, steelId])`
- `@@index([steelId])`
- `@@index([status])`

### LabelCheck
**Tabela:** `label_checks` | **Soft Delete:** tak (deletedAt)
> Sprawdzenie etykiet dla dostawy

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| deliveryId | Int | tak | - | FK |
| deliveryDate | DateTime | tak | - | - |
| status | String | tak | pending | 'pending' / 'completed' / 'failed' |
| totalOrders | Int | tak | 0 | - |
| checkedCount | Int | tak | 0 | - |
| okCount | Int | tak | 0 | - |
| mismatchCount | Int | tak | 0 | - |
| errorCount | Int | tak | 0 | - |
| createdAt | DateTime | tak | now() | - |
| completedAt | DateTime | - | - | - |
| deletedAt | DateTime | - | - | - |

**Relacje:**
- `delivery` -> Delivery (many-to-one)
- `results` -> LabelCheckResult[] (one-to-many)

**Indeksy:**
- `@@index([deliveryId])`
- `@@index([status])`
- `@@index([createdAt])`
- `@@index([deletedAt])`

### LabelCheckResult
**Tabela:** `label_check_results`
> Wynik sprawdzenia etykiety dla pojedynczego zlecenia

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| labelCheckId | Int | tak | - | FK |
| orderId | Int | tak | - | FK |
| orderNumber | String | tak | - | - |
| status | String | tak | - | 'OK' / 'MISMATCH' / 'NO_FOLDER' / 'NO_BMP' / 'OCR_ERROR' |
| expectedDate | DateTime | tak | - | - |
| detectedDate | DateTime | - | - | - |
| detectedText | String | - | - | - |
| imagePath | String | - | - | - |
| errorMessage | String | - | - | - |
| createdAt | DateTime | tak | now() | - |

**Relacje:**
- `labelCheck` -> LabelCheck (many-to-one)

**Indeksy:**
- `@@index([labelCheckId])`
- `@@index([orderId])`
- `@@index([status])`

### LogisticsMailList
**Tabela:** `logistics_mail_lists` | **Soft Delete:** tak (deletedAt)
> Lista mailowa - reprezentuje jeden mail z listą projektów na dostawę Każda aktualizacja listy tworzy nową wersję (v1, v2, v3...)

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| deliveryDate | DateTime | tak | - | Data dostawy (np. 2026-02-16) |
| deliveryIndex | Int | tak | - | Index dostawy (_I = 1, _II = 2, _III = 3) |
| deliveryCode | String | tak | - | Kod dostawy np. "16.02.2026_I" |
| version | Int | tak | 1 | Wersja listy (v1, v2, v3...) |
| isUpdate | Boolean | tak | false | Czy to aktualizacja (vs nowa lista) |
| rawMailText | String | tak | - | Oryginalny tekst maila |
| parsedAt | DateTime | tak | now() | Kiedy sparsowano |
| createdAt | DateTime | tak | now() | - |
| deletedAt | DateTime | - | - | Soft delete |
| deliveryId | Int | - | - | FK, Powiązanie z dostawą (auto-linking po dacie lub ręczne) |

**Relacje:**
- `delivery` -> Delivery (many-to-one)
- `items` -> LogisticsMailItem[] (one-to-many)

**Indeksy:**
- `@@unique([deliveryCode, version])`
- `@@index([deliveryDate])`
- `@@index([deliveryCode])`
- `@@index([deletedAt])`
- `@@index([deliveryId])`

### LogisticsMailItem
**Tabela:** `logistics_mail_items` | **Soft Delete:** tak (deletedAt)
> Pozycja z maila - jeden projekt na liście

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| mailListId | Int | tak | - | FK |
| position | Int | tak | - | Kolejność na liście (Lp.) |
| projectNumber | String | tak | - | Numer projektu (D6086, C8748) |
| quantity | Int | tak | 1 | Ilość (x2 = 2) |
| rawNotes | String | - | - | Oryginalne adnotacje z maila |
| requiresMesh | Boolean | tak | false | Flaga: poproszę o siatkę |
| missingFile | Boolean | tak | false | Flagi blokujące - powodują status 'blocked' brak pliku |
| unconfirmed | Boolean | tak | false | niepotwierdzone |
| dimensionsUnconfirmed | Boolean | tak | false | wymiary niepotwierdzone |
| drawingUnconfirmed | Boolean | tak | false | rysunek niepotwierdzony |
| excludeFromProduction | Boolean | tak | false | Flagi specjalne bez okna |
| specialHandle | Boolean | tak | false | klamka alu z kluczem |
| customColor | String | - | - | RAL XXXX (jeśli wykryto) |
| orderId | Int | - | - | FK, Powiązanie z Order (nullable - może nie istnieć w bazie) |
| itemStatus | String | tak | ok | Status wyliczany: ok / blocked / waiting / excluded blocked = missingFile OR unconfirmed OR dimensionsUnconfirmed OR drawingUnconfirmed waiting = requiresMesh AND NOT blocked excluded = excludeFromProduction ok = brak flag |
| confirmedAt | DateTime | - | - | Metadata dla systemu decyzji diff Kiedy użytkownik potwierdził pozycję |
| deletedAt | DateTime | - | - | Soft delete - pozycja usunięta przez użytkownika |

**Relacje:**
- `order` -> Order (many-to-one)
- `mailList` -> LogisticsMailList (many-to-one)
- `decisionLogs` -> LogisticsDecisionLog[] (one-to-many)

**Indeksy:**
- `@@index([mailListId])`
- `@@index([projectNumber])`
- `@@index([orderId])`
- `@@index([itemStatus])`

### LogisticsDecisionLog
**Tabela:** `logistics_decision_logs`
> Log decyzji użytkownika - AUDYT Zapisuje kto, kiedy, co zrobił z pozycją/dostawą Pozwala odtworzyć historię zmian i rozstrzygać spory

**Pola:**
| Pole | Typ | Wymagane | Default | Uwagi |
|------|-----|----------|---------|-------|
| id | Int | tak | autoincrement() | @id |
| entityType | String | tak | - | Typ encji: 'item' (pozycja) lub 'delivery' (cała lista/dostawa) 'item' / 'delivery' |
| entityId | Int | tak | - | FK, ID pozycji lub listy |
| action | String | tak | - | Akcja podjęta przez użytkownika item: confirm / reject / remove / accept_change / restore delivery: save / delete confirm / reject / remove / accept_change / restore / save / delete |
| fromVersion | Int | - | - | Kontekst wersji (dla diff) Z której wersji (null dla nowych) |
| toVersion | Int | - | - | Do której wersji |
| metadata | String | - | - | Dodatkowe dane (JSON) - np. co dokładnie się zmieniło Dla restore: { field: "quantity", oldValue: "1", newValue: "2" } Dla confirm: { projectNumber: "D6086" } JSON string z dodatkowymi danymi |
| userId | Int | tak | - | FK, Kto podjął decyzję |
| createdAt | DateTime | tak | now() | Kiedy |
| mailItemId | Int | - | - | FK, Opcjonalna relacja do pozycji (tylko dla entityType='item') |

**Relacje:**
- `user` -> User (many-to-one)
- `mailItem` -> LogisticsMailItem (many-to-one)

**Indeksy:**
- `@@index([entityType, entityId])`
- `@@index([userId])`
- `@@index([createdAt])`
- `@@index([action])`
