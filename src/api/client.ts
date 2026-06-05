import type { ApiErrorBody, Plan, Subscription, TokenResponse, User, UserRole, VpnConfig } from "../types";

declare global {
  interface Window {
    __APP_CONFIG__?: {
      API_BASE_URL?: string;
    };
  }
}

function getApiBaseUrl(): string {
  const configured = window.__APP_CONFIG__?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL;
  if (configured) return configured;
  return `${window.location.protocol}//${window.location.hostname}:8000`;
}

const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return translateApiError(body.detail) ?? `Ошибка запроса: ${response.status}`;
  } catch {
    return `Ошибка запроса: ${response.status}`;
  }
}

function translateApiError(detail: string | undefined): string | undefined {
  if (!detail) return undefined;
  const messages: Record<string, string> = {
    "email already exists": "Email уже зарегистрирован",
    "invalid credentials": "Неверный email или пароль",
    "user blocked": "Пользователь заблокирован",
    "invalid refresh token": "Сессия истекла. Войдите снова",
    "invalid verification token": "Недействительная ссылка подтверждения",
    "invalid reset token": "Недействительный токен сброса пароля",
    "subscription expired": "Подписка истекла",
    "config limit exceeded": "Достигнут лимит VPN-конфигов",
    "config not active": "VPN-конфиг не активен",
    "config expired": "Срок действия VPN-конфига истек",
    "awg-server unavailable": "VPN-сервер временно недоступен",
    forbidden: "Недостаточно прав",
  };
  return messages[detail] ?? detail;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  register: (email: string, password: string) =>
    request<TokenResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  refresh: (refreshToken: string) =>
    request<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),
  logout: (refreshToken: string) =>
    request<{ message: string }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),
  verifyEmailGet: (token: string) => request<{ message: string }>(`/auth/email/verify?token=${encodeURIComponent(token)}`),
  requestPasswordReset: (email: string) =>
    request<{ message: string }>("/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  confirmPasswordReset: (token: string, password: string) =>
    request<{ message: string }>("/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  me: (token: string) => request<User>("/me", {}, token),
  plans: () => request<Plan[]>("/plans"),
  currentSubscription: (token: string) => request<Subscription>("/subscriptions/current", {}, token),
  vpnConfigs: (token: string) => request<VpnConfig[]>("/vpn/configs", {}, token),
  createVpnConfig: (token: string) => request<VpnConfig>("/vpn/configs", { method: "POST" }, token),
  revokeVpnConfig: (token: string, id: string) => request<VpnConfig>(`/vpn/configs/${id}/revoke`, { method: "POST" }, token),
  downloadVpnConfig: async (token: string, id: string): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/vpn/configs/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new ApiError(response.status, await parseError(response));
    return response.blob();
  },
  adminUsers: (token: string) => request<User[]>("/admin/users", {}, token),
  adminConfigs: (token: string) => request<VpnConfig[]>("/admin/configs", {}, token),
  adminSubscriptions: (token: string) => request<Subscription[]>("/admin/subscriptions", {}, token),
  patchUser: (token: string, id: string, data: { role?: UserRole; is_active?: boolean; tgid?: number | null }) =>
    request<User>(
      `/admin/users/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      token,
    ),
};
