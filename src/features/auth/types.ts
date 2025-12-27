// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface User {
  user_id: number;
  username: string;
  email: string;
  name: string;
  role: string[];
  avatar?: string;
  createdAt?: string;
  // User meta fields from API
  phone?: string;
  mobile_phone?: string;
  location?: string;
}

export interface AuthResponse {
  status: string;
  code: number;
  user: User;
  access_token: string;
  refresh_token: string;
  message: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}
