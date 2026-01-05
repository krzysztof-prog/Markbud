import type { ID, Timestamp } from './common';
import type { Profile } from './profile';
import type { Color } from './color';

/**
 * Wymaganie/zapotrzebowanie na profil w zleceniu
 */
export interface Requirement {
  id: ID;
  orderId: ID;
  profileId: ID;
  colorId: ID;
  beamsCount: number;  // Liczba belek (belki = 6m)
  meters?: number;      // Długość w metrach
  restMm?: number;      // Reszta w milimetrach
  profile?: Profile;
  color?: Color;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateRequirementData {
  profileId: number;
  colorId: number;
  beamsCount: number;
  meters?: number;
  restMm?: number;
}

export interface UpdateRequirementData {
  profileId?: number;
  colorId?: number;
  beamsCount?: number;
  meters?: number;
  restMm?: number;
}

/**
 * Suma zapotrzebowań per profil+kolor
 */
export interface RequirementTotal {
  profileId: ID;
  colorId: ID;
  totalQuantity: number;
  profile?: Profile;
  color?: Color;
}
