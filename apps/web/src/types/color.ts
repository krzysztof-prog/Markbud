import type { ID, Timestamp } from './common';

/**
 * Kolor profilu (RAL)
 */
export interface Color {
  id: ID;
  name: string;
  code: string;
  type: 'typical' | 'atypical';
  hexColor?: string;
  isVisible: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateColorData {
  name: string;
  code: string;
  type: 'typical' | 'atypical';
  hexColor?: string;
  isVisible?: boolean;
}

export interface UpdateColorData {
  name?: string;
  code?: string;
  type?: 'typical' | 'atypical';
  hexColor?: string;
  isVisible?: boolean;
}
