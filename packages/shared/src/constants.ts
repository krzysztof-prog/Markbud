// Numery profili aluminiowych
export const PROFILE_NUMBERS = [
  '9016',
  '8866',
  '8869',
  '9671',
  '9677',
  '9315',
] as const;

export type ProfileNumber = (typeof PROFILE_NUMBERS)[number];

// Kolory typowe
export const TYPICAL_COLORS = {
  '000': 'biały',
  '050': 'kremowy',
  '730': 'antracyt x1',
  '750': 'biała folia x1',
  '148': 'krem folia x1',
  '145': 'antracyt x1 (b.krem)',
  '146': 'granat x1 (b.krem)',
  '147': 'jodłowy x1 (b.krem)',
  '830': 'granat x1',
  '890': 'jodłowy x1',
  '128': 'Schwarzgrau',
  '864': 'zielony monumentalny',
} as const;

// Kolory nietypowe
export const ATYPICAL_COLORS = {
  '680': 'biała folia x2',
  '533': 'szary czarny x2',
  '154': 'antracyt x2',
  '155': 'krem folia/biały (b.krem)',
  '537': 'quartgrau x1',
  '201': 'biała folia/antracyt',
} as const;

// Długość standardowej beli w mm
export const BEAM_LENGTH_MM = 6000;

// Zaokrąglenie reszty do wielokrotności (mm)
export const REST_ROUNDING_MM = 500;

// Statusy zleceń
export const ORDER_STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

// Statusy dostaw
export const DELIVERY_STATUS = {
  PLANNED: 'planned',
  IN_PREPARATION: 'in_preparation',
  READY: 'ready',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
} as const;

export type DeliveryStatus = (typeof DELIVERY_STATUS)[keyof typeof DELIVERY_STATUS];

// Typy importowanych plików
export const FILE_IMPORT_TYPE = {
  UZYTE_BELE: 'uzyte_bele',
  CENY_PDF: 'ceny_pdf',
  DOSTAWA_SZKLA: 'dostawa_szkla',
  POTWIERDZENIE_ZAMOWIENIA: 'potwierdzenie_zamowienia',
} as const;

export type FileImportType = (typeof FILE_IMPORT_TYPE)[keyof typeof FILE_IMPORT_TYPE];

// Statusy importu
export const IMPORT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
  REJECTED: 'rejected',
} as const;

export type ImportStatus = (typeof IMPORT_STATUS)[keyof typeof IMPORT_STATUS];
