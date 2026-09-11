import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Apple, Download, FileText, LogOut, Plus, ShieldCheck, Smartphone, User, Wallet } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { ApiError, api } from "../api/client";
import { useAuth } from "../state/auth";
import { Alert } from "../ui/Alert";
import type { VpnConfig } from "../types";

const APP_LINKS = [
  {
    title: "AmneziaWG для iPhone",
    subtitle: "Скачать в App Store",
    href: "https://apps.apple.com/us/app/amneziawg/id6478942365",
    icon: Apple,
  },
  {
    title: "AmneziaWG для Android",
    subtitle: "Скачать в Google Play",
    href: "https://play.google.com/store/apps/details?id=org.amnezia.awg&hl=ru&pli=1",
    icon: Smartphone,
  },
];

const STATUS_LABELS: Record<VpnConfig["status"], string> = {
  active: "Активен",
  pending_revoke: "Отзывается",
  expired: "Истёк",
  revoked: "Отозван",
  failed: "Ошибка",
};

const STATUS_BADGE: Record<VpnConfig["status"], string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending_revoke: "border-amber-200 bg-amber-50 text-amber-700",
  expired: "border-slate-200 bg-slate-100 text-slate-600",
  revoked: "border-slate-200 bg-slate-100 text-slate-600",
  failed: "border-red-200 bg-red-50 text-red-700",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "numeric", year: "numeric" });
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function DownloadPage() {
  const { accessToken, user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: balance } = useQuery({
    queryKey: ["balance"],
    queryFn: () => api.getBalance(accessToken!),
    enabled: Boolean(accessToken),
  });
  const { data: configs, isLoading } = useQuery({
    queryKey: ["configs"],
    queryFn: () => api.getVpnConfigs(accessToken!),
    enabled: Boolean(accessToken),
  });

  function handleError(err: unknown, fallback: string) {
    setMessage(null);
    setError(err instanceof ApiError ? err.message : fallback);
  }

  const createMutation = useMutation({
    mutationFn: () => api.createVpnConfig(accessToken!),
    onSuccess: (config) => {
      setError(null);
      setMessage(`Конфиг создан. Скачайте его и импортируйте в AmneziaWG.`);
      void queryClient.invalidateQueries({ queryKey: ["configs"] });
      return config;
    },
    onError: (err) => handleError(err, "Не удалось создать VPN-конфиг"),
  });

  const downloadMutation = useMutation({
    mutationFn: (config: VpnConfig) => api.downloadVpnConfig(accessToken!, config.id),
    onSuccess: (blob, config) => {
      setError(null);
      saveBlob(blob, `ghostgate-${config.id}.conf`);
      setMessage("Конфиг скачан. Импортируйте файл в приложение AmneziaWG.");
    },
    onError: (err) => handleError(err, "Не удалось скачать VPN-конфиг"),
  });

  const activeCount = (configs ?? []).filter((config) => config.status === "active").length;
  const isStaff = user?.role === "admin" || user?.role === "support";

  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-ink">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-3xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">GhostGateVPN</div>
            <div className="mt-1 max-w-[220px] truncate text-sm text-muted sm:max-w-none">{user?.email}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge border-line bg-white text-ink" title="Баланс">
              <Wallet className="h-3.5 w-3.5" />
              {balance ? `${balance.balance.toLocaleString("ru-RU")} ₽` : "…"}
            </span>
            <Link className="btn btn-secondary" to="/app/account">
              <User className="h-4 w-4" />
              Аккаунт
            </Link>
            {isStaff ? (
              <Link className="btn btn-secondary" to="/app/admin">
                <ShieldCheck className="h-4 w-4" />
                Админка
              </Link>
            ) : null}
            <button className="btn btn-secondary" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Выйти
            </button>
          </div>
        </header>

        <section className="flex flex-1 flex-col py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-ink">Мои конфиги</h1>
              <p className="mt-1 text-sm text-muted">Скачайте файл и импортируйте его в приложение AmneziaWG.</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              {createMutation.isPending ? "Создаем..." : "Создать конфиг"}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {error ? <Alert>{error}</Alert> : null}
            {message ? <Alert tone="success">{message}</Alert> : null}

            {isLoading ? (
              <div className="panel p-6 text-sm text-muted">Загружаем конфиги...</div>
            ) : (configs ?? []).length === 0 ? (
              <div className="panel flex flex-col items-center p-8 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                  <FileText className="h-6 w-6" />
                </span>
                <p className="mt-4 text-sm font-medium text-ink">Конфигов пока нет</p>
                <p className="mt-1 text-sm text-muted">Нажмите «Создать конфиг», чтобы получить первый файл.</p>
              </div>
            ) : (
              (configs ?? []).map((config) => (
                <div key={config.id} className="panel flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">ghostgate-{config.id.slice(0, 8)}</span>
                      <span className={`badge ${STATUS_BADGE[config.status]}`}>{STATUS_LABELS[config.status]}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      создан {formatDate(config.created_at)} · действует до {formatDate(config.expires_at)}
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => downloadMutation.mutate(config)}
                    disabled={config.status !== "active" || downloadMutation.isPending}
                    title={config.status !== "active" ? "Скачать можно только активный конфиг" : undefined}
                  >
                    <Download className="h-4 w-4" />
                    {downloadMutation.isPending ? "Скачиваем..." : "Скачать"}
                  </button>
                </div>
              ))
            )}
          </div>

          <section className="mt-8">
            <h2 className="text-base font-semibold">
              Установите приложение{activeCount > 0 ? " и импортируйте конфиг" : ""}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {APP_LINKS.map((app) => {
                const Icon = app.icon;
                return (
                  <a
                    key={app.href}
                    className="panel flex items-center gap-3 p-4 transition hover:border-brand-500 hover:bg-brand-50"
                    href={app.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white text-brand-700 ring-1 ring-line">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{app.title}</span>
                      <span className="mt-1 block text-sm text-muted">{app.subtitle}</span>
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
