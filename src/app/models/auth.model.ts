export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'Admin' | 'Éditeur' | 'Rédacteur' | 'Lecteur';
  avatar?: string | null;
  verified: boolean;
  isActive: boolean;
}

