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
  quantity: number;
  profile?: Profile;
  color?: Color;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateRequirementData {
  profileId: number;
  colorId: number;
  quantity: number;
}

export interface UpdateRequirementData {
  profileId?: number;
  colorId?: number;
  quantity?: number;
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
