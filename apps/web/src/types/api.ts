/**
 * API Request/Response types
 * Typy dla komunikacji z backendem
 */

import type {
  Color,
  CreateColorData,
  UpdateColorData,
  Profile,
  CreateProfileData,
  UpdateProfileData,
  Order,
  CreateOrderData,
  UpdateOrderData,
  OrderTableData,
  Delivery,
  CreateDeliveryData,
  UpdateDeliveryData,
  DeliveryCalendarData,
  WarehouseStock,
  UpdateStockData,
  WarehouseOrder,
  CreateWarehouseOrderData,
  UpdateWarehouseOrderData,
  MonthlyStockUpdate,
  OkucArticle,
  CreateOkucArticleData,
  UpdateOkucArticleData,
  OkucStock,
  UpdateOkucStockData,
  OkucOrder,
  CreateOkucOrderData,
  UpdateOkucOrderData,
  PalletType,
  CreatePalletTypeData,
  UpdatePalletTypeData,
  Import,
  DashboardResponse,
  Alert,
} from '.';

/**
 * Kolory API
 */
export interface ColorsApi {
  getAll: (type?: 'typical' | 'atypical') => Promise<Color[]>;
  getById: (id: number) => Promise<Color>;
  create: (data: CreateColorData) => Promise<Color>;
  update: (id: number, data: UpdateColorData) => Promise<Color>;
  delete: (id: number) => Promise<void>;
}

/**
 * Profile API
 */
export interface ProfilesApi {
  getAll: () => Promise<Profile[]>;
  getById: (id: number) => Promise<Profile>;
  create: (data: CreateProfileData) => Promise<Profile>;
  update: (id: number, data: UpdateProfileData) => Promise<Profile>;
  delete: (id: number) => Promise<void>;
}

/**
 * Zlecenia API
 */
export interface OrdersApi {
  getAll: (params?: { status?: string; archived?: string; colorId?: string }) => Promise<Order[]>;
  getById: (id: number) => Promise<Order>;
  getTable: (colorId: number) => Promise<OrderTableData>;
  getRequirementsTotals: () => Promise<Array<{ profileId: number; total: number }>>;
  getPdf: (id: number) => Promise<boolean>;
  create: (data: CreateOrderData) => Promise<Order>;
  update: (id: number, data: UpdateOrderData) => Promise<Order>;
  archive: (id: number) => Promise<Order>;
  unarchive: (id: number) => Promise<Order>;
  delete: (id: number) => Promise<void>;
}

/**
 * Requirements API
 */
export interface RequirementsApi {
  getByColorId: (colorId: number) => Promise<Array<{ profileId: number; total: number }>>;
  updateByColorId: (
    colorId: number,
    data: { profileId: number; quantity: number }[]
  ) => Promise<void>;
  monthlyUpdate: (data: MonthlyStockUpdate) => Promise<void>;
}

/**
 * Dostawy API
 */
export interface DeliveriesApi {
  getAll: () => Promise<Delivery[]>;
  getById: (id: number) => Promise<Delivery>;
  getCalendar: () => Promise<DeliveryCalendarData>;
  create: (data: CreateDeliveryData) => Promise<Delivery>;
  update: (id: number, data: UpdateDeliveryData) => Promise<Delivery>;
  delete: (id: number) => Promise<void>;
}

/**
 * Magazyn profili API
 */
export interface WarehouseApi {
  getAll: () => Promise<WarehouseStock[]>;
  getByColor: (colorId: number) => Promise<WarehouseStock[]>;
  updateStock: (colorId: number, profileId: number, data: UpdateStockData) => Promise<WarehouseStock>;
  getOrders: (colorId?: number) => Promise<WarehouseOrder[]>;
  createOrder: (data: CreateWarehouseOrderData) => Promise<WarehouseOrder>;
  updateOrder: (id: number, data: UpdateWarehouseOrderData) => Promise<WarehouseOrder>;
  deleteOrder: (id: number) => Promise<void>;
}

/**
 * Ustawienia API
 */
export interface SettingsApi {
  getPalletTypes: () => Promise<PalletType[]>;
  createPalletType: (data: CreatePalletTypeData) => Promise<PalletType>;
  updatePalletType: (id: number, data: UpdatePalletTypeData) => Promise<PalletType>;
  deletePalletType: (id: number) => Promise<void>;
}

/**
 * Okuć API
 */
export interface OkucApi {
  getArticles: () => Promise<OkucArticle[]>;
  createArticle: (data: CreateOkucArticleData) => Promise<OkucArticle>;
  updateArticle: (id: number, data: UpdateOkucArticleData) => Promise<OkucArticle>;
  deleteArticle: (id: number) => Promise<void>;
  getStock: () => Promise<OkucStock[]>;
  updateStock: (articleId: number, data: UpdateOkucStockData) => Promise<OkucStock>;
  getOrders: () => Promise<OkucOrder[]>;
  createOrder: (data: CreateOkucOrderData) => Promise<OkucOrder>;
  updateOrder: (id: number, data: UpdateOkucOrderData) => Promise<OkucOrder>;
  deleteOrder: (id: number) => Promise<void>;
}

/**
 * Import API
 */
export interface ImportsApi {
  getHistory: () => Promise<Import[]>;
  processImport: (file: File) => Promise<Import>;
  getImportDetails: (id: number) => Promise<Import>;
}

/**
 * Dashboard API
 */
export interface DashboardApi {
  getDashboard: () => Promise<DashboardResponse>;
  getAlerts: () => Promise<Alert[]>;
}

/**
 * Complete API client interface
 */
export interface ApiClient {
  colors: ColorsApi;
  profiles: ProfilesApi;
  orders: OrdersApi;
  requirements: RequirementsApi;
  deliveries: DeliveriesApi;
  warehouse: WarehouseApi;
  settings: SettingsApi;
  okuc: OkucApi;
  imports: ImportsApi;
  dashboard: DashboardApi;
}
