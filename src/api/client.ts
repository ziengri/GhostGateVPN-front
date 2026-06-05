import type { ApiErrorBody, TokenResponse, User } from "../types";

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
  createAndDownloadVpnConfig: async (token: string): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/vpn/configs/create-and-download`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new ApiError(response.status, await parseError(response));
    return response.blob();
  },
};
