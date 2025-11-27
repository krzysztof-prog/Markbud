export interface Profile {
  id: number;
  number: string; // np. '9016', '8866'
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProfileDto {
  number: string;
  name: string;
  description?: string;
}

export interface UpdateProfileDto {
  name?: string;
  description?: string;
}
