export interface User {
  id: string;
  email: string;
  role: "user" | "admin" | "support";
  tgid: number | null;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  user: User;
}

export interface ApiErrorBody {
  detail?: string;
}
