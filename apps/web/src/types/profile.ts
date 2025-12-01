import type { ID, Timestamp } from './common';
import type { Color } from './color';

/**
 * Profil aluminiowy
 */
export interface Profile {
  id: ID;
  number: string;
  name: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProfileColor {
  id: ID;
  profileId: ID;
  colorId: ID;
  isVisible: boolean;
  profile?: Profile;
  color?: Color;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProfileWithColors extends Profile {
  profileColors: ProfileColor[];
}

export interface CreateProfileData {
  number: string;
  name: string;
  description?: string;
}

export interface UpdateProfileData {
  number?: string;
  name?: string;
  description?: string;
}
