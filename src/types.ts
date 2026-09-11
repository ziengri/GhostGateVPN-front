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
  detail?: string | { msg?: string }[];
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  duration_days: number;
  max_configs: number;
  price_amount: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: "active" | "expired" | "cancelled" | "trial";
  starts_at: string;
  expires_at: string;
  created_at: string;
}

export interface Balance {
  balance: number;
  currency: string;
}

export interface BalanceTransaction {
  id: string;
  amount: number;
  reason: string;
  plan_id: string | null;
  subscription_id: string | null;
  created_at: string;
}

export interface PurchaseResult {
  subscription: Subscription;
  balance: number;
}

export interface TelegramLinkCode {
  code: string;
  expires_at: string;
}

export interface VpnConfig {
  id: string;
  user_id: string;
  subscription_id: string | null;
  awg_client_id: string;
  status: "active" | "pending_revoke" | "expired" | "revoked" | "failed";
  starts_at: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  last_sync_at: string | null;
}
