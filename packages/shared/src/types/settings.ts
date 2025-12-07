import type { FileImportType, ImportStatus } from '../constants';

// Ustawienia aplikacji
export interface AppSettings {
  // Ścieżki do folderów
  watchFolderUzyteBele: string;
  watchFolderCeny: string;
  importsBasePath: string; // Główna ścieżka do folderów z dostawami (np. C:\Dostawy)

  // Kurs walut
  eurToPlnRate: number;
  eurToPlnRateUpdatedAt?: Date;

  // IMAP
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapTls?: boolean;

  // Inne
  autoArchiveCompletedOrders: boolean;
  lowStockThreshold: number; // próg niskiego stanu magazynu
}

// Import plików
export interface FileImport {
  id: number;
  filename: string;
  filepath: string;
  fileType: FileImportType;
  status: ImportStatus;
  processedAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, unknown>; // dodatkowe dane z parsowania
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFileImportDto {
  filename: string;
  filepath: string;
  fileType: FileImportType;
}

// Notatki
export interface Note {
  id: number;
  orderId?: number; // opcjonalnie powiązane ze zleceniem
  content: string;
  createdAt: Date;
  createdBy?: string;
  updatedAt: Date;
}

export interface CreateNoteDto {
  orderId?: number;
  content: string;
}

// Zestawienie miesięczne
export interface MonthlyReport {
  month: number;
  year: number;
  orders: MonthlyReportOrder[];
  totalOrders: number;
  totalWindows: number;
  totalUnits: number;
  totalWings: number;
  totalValuePln: number;
  totalValueEur: number;
  generatedAt: Date;
}

export interface MonthlyReportOrder {
  orderNumber: string;
  windowsCount: number;
  unitsCount: number;
  wingsCount: number;
  valuePln: number;
  valueEur: number;
  invoiceNumber?: string;
}
