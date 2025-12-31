/**
 * Standardowe komunikaty toast po polsku z poprawnymi znakami
 *
 * @module toast-messages
 * @description Centralne repozytorium wszystkich komunikatów toast w aplikacji
 */

export const TOAST_MESSAGES = {
  // Generic actions
  success: 'Sukces',
  error: 'Błąd',
  warning: 'Ostrzeżenie',
  info: 'Informacja',

  // Deliveries (Dostawy)
  delivery: {
    created: 'Dostawa utworzona',
    createdDesc: 'Pomyślnie utworzono nową dostawę',
    updated: 'Dostawa zaktualizowana',
    updatedDesc: 'Pomyślnie zaktualizowano dostawę',
    deleted: 'Dostawa usunięta',
    deletedDesc: 'Pomyślnie usunięto dostawę',
    orderAdded: 'Zlecenie dodane',
    orderAddedDesc: 'Zlecenie zostało dodane do dostawy',
    orderRemoved: 'Zlecenie usunięte',
    orderRemovedDesc: 'Zlecenie zostało usunięte z dostawy',
    orderMoved: 'Zlecenie przeniesione',
    orderMovedDesc: 'Zlecenie zostało przeniesione między dostawami',
    itemAdded: 'Artykuł dodany',
    itemAddedDesc: 'Pomyślnie dodano artykuł do dostawy',
    itemDeleted: 'Artykuł usunięty',
    itemDeletedDesc: 'Pomyślnie usunięto artykuł z dostawy',
    ordersCompleted: 'Zlecenia zakończone',
    ordersCompletedDesc: 'Pomyślnie oznaczono zlecenia jako wyprodukowane',
    errorCreate: 'Błąd tworzenia dostawy',
    errorDelete: 'Błąd usuwania dostawy',
    errorAddOrder: 'Błąd dodawania zlecenia',
    errorRemoveOrder: 'Błąd usuwania zlecenia',
    errorMoveOrder: 'Błąd przenoszenia zlecenia',
    errorAddItem: 'Błąd dodawania artykułu',
    errorDeleteItem: 'Błąd usuwania artykułu',
    errorCompleteOrders: 'Błąd kończenia zleceń',
  },

  // Orders (Zlecenia)
  order: {
    created: 'Zlecenie utworzone',
    createdDesc: 'Pomyślnie utworzono nowe zlecenie',
    updated: 'Zlecenie zaktualizowane',
    updatedDesc: 'Pomyślnie zaktualizowano zlecenie',
    deleted: 'Zlecenie usunięte',
    deletedDesc: 'Pomyślnie usunięto zlecenie',
    archived: 'Zlecenie zarchiwizowane',
    archivedDesc: 'Pomyślnie zarchiwizowano zlecenie',
    errorCreate: 'Błąd tworzenia zlecenia',
    errorUpdate: 'Błąd aktualizacji zlecenia',
    errorDelete: 'Błąd usuwania zlecenia',
    errorArchive: 'Błąd archiwizacji zlecenia',
  },

  // Warehouse (Magazyn)
  warehouse: {
    stockUpdated: 'Stan magazynowy zaktualizowany',
    stockUpdatedDesc: 'Pomyślnie zaktualizowano stan magazynowy',
    orderPlaced: 'Zamówienie złożone',
    orderPlacedDesc: 'Pomyślnie złożono zamówienie',
    deliveryReceived: 'Dostawa przyjęta',
    deliveryReceivedDesc: 'Pomyślnie przyjęto dostawę do magazynu',
    profileAdded: 'Profil dodany',
    profileAddedDesc: 'Pomyślnie dodano profil do magazynu',
    errorUpdate: 'Błąd aktualizacji magazynu',
    errorOrder: 'Błąd składania zamówienia',
    errorDelivery: 'Błąd przyjmowania dostawy',
  },

  // Import (Importy)
  import: {
    uploaded: 'Plik przesłany',
    uploadedDesc: 'Plik oczekuje na zatwierdzenie',
    approved: 'Import zatwierdzony',
    approvedDesc: 'Plik został pomyślnie zaimportowany',
    rejected: 'Import odrzucony',
    rejectedDesc: 'Plik został pomyślnie odrzucony',
    deleted: 'Import usunięty',
    deletedDesc: 'Import został pomyślnie usunięty',
    bulkApproved: (count: number) => `Pomyślnie zatwierdzono ${count} importów`,
    bulkRejected: (count: number) => `Pomyślnie odrzucono ${count} importów`,
    bulkPartial: (success: number, failed: number) =>
      `${success} pomyślnie, ${failed} z błędami`,
    folderScanned: 'Folder przeskanowany',
    folderImported: 'Import zakończony',
    folderArchived: 'Folder zarchiwizowany',
    folderDeleted: 'Folder usunięty',
    folderDeletedDesc: 'Folder został trwale usunięty',
    noCsvFiles: 'Brak plików CSV',
    noCsvFilesDesc: 'Nie znaleziono plików CSV z "uzyte" lub "bele" w nazwie',
    noDate: 'Brak daty w nazwie folderu',
    noDateDesc: 'Nazwa folderu powinna zawierać datę w formacie DD.MM.YYYY',
    errorUpload: 'Błąd przesyłania',
    errorApprove: 'Błąd importu',
    errorReject: 'Błąd',
    errorDelete: 'Błąd usuwania',
    errorBulk: 'Błąd przetwarzania',
    errorScan: 'Błąd skanowania',
    errorFolderImport: 'Błąd importu',
    errorArchive: 'Błąd archiwizacji',
    errorFolderDelete: 'Błąd usuwania',
  },

  // Glass (Szyby)
  glass: {
    orderCreated: 'Zamówienie szyb utworzone',
    orderUpdated: 'Zamówienie szyb zaktualizowane',
    deliveryCreated: 'Dostawa szyb utworzona',
    deliveryUpdated: 'Dostawa szyb zaktualizowana',
    errorCreate: 'Błąd tworzenia zamówienia szyb',
    errorUpdate: 'Błąd aktualizacji zamówienia szyb',
  },

  // Settings (Ustawienia)
  settings: {
    saved: 'Ustawienia zapisane',
    savedDesc: 'Pomyślnie zapisano ustawienia',
    errorSave: 'Błąd zapisywania ustawień',
  },

  // Working Days (Dni robocze)
  workingDays: {
    workingDay: 'Dzień roboczy',
    workingDayDesc: 'Oznaczono jako dzień roboczy',
    dayOff: 'Dzień wolny',
    dayOffDesc: 'Oznaczono jako dzień wolny',
    errorToggle: 'Błąd zmiany dnia',
  },

  // Schuco
  schuco: {
    syncSuccess: 'Synchronizacja Schuco zakończona',
    syncError: 'Błąd synchronizacji Schuco',
  },
} as const;

/**
 * Helper do szybkiego tworzenia toast message
 */
export function getToastMessage(
  category: keyof typeof TOAST_MESSAGES,
  action: string,
): string {
  const categoryMessages = TOAST_MESSAGES[category];

  if (typeof categoryMessages === 'object' && action in categoryMessages) {
    const message = categoryMessages[action as keyof typeof categoryMessages];

    if (typeof message === 'string') {
      return message;
    }
  }

  return TOAST_MESSAGES.success;
}
