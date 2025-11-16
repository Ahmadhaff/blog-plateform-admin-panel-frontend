export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'Admin' | 'Éditeur' | 'Rédacteur' | 'Lecteur';
  verified: boolean;
  isActive: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UserFilters {
  role?: string;
  isActive?: string;
  search?: string;
  page?: number;
  limit?: number;
}

