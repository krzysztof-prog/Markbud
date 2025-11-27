export type ColorType = 'typical' | 'atypical';

export interface Color {
  id: number;
  code: string; // np. '050', '730'
  name: string; // np. 'kremowy', 'antracyt'
  type: ColorType;
  hexColor?: string; // np. '#F5F5DC' dla podglądu
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateColorDto {
  code: string;
  name: string;
  type: ColorType;
  hexColor?: string;
}

export interface UpdateColorDto {
  name?: string;
  type?: ColorType;
  hexColor?: string;
}

// Powiązanie profilu z kolorem (widoczność w tabelach)
export interface ProfileColor {
  id: number;
  profileId: number;
  colorId: number;
  isVisible: boolean;
}
