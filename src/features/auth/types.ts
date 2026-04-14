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

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  key: string;
  login: string;
  new_password: string;
}

export interface Permissions {
  boards?: {
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_view: boolean;
  };
  groups?: {
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_view: boolean;
  };
  tasks?: {
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_assign: boolean;
  };
}

export interface User {
  user_id: number;
  username: string;
  email: string;
  name: string;
  organization_id: number;
  role_id: number;
  role_label: string;
  avatar?: string;
  createdAt?: string;
  role?: string[];
  permissions?: Permissions;
  organizations?: {
    organization_id: number;
    organization_name: string;
    role_id: number;
    role_label: string;
  }[];
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
  token_type: string;
  expires_in: number;
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
