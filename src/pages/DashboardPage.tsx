import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { ApiError, api } from "../api/client";
import { daysUntil, formatDate, roleLabel, statusLabel, statusTone } from "../lib/format";
import { useAuth } from "../state/auth";
import type { VpnConfig } from "../types";
import { Alert } from "../ui/Alert";
import { SectionHeader } from "../ui/SectionHeader";

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

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.currentSubscription(accessToken!),
    enabled: Boolean(accessToken),
  });
  const configsQuery = useQuery({
    queryKey: ["vpn-configs"],
    queryFn: () => api.vpnConfigs(accessToken!),
    enabled: Boolean(accessToken),
  });
  const plansQuery = useQuery({
    queryKey: ["plans"],
    queryFn: api.plans,
  });

  const createMutation = useMutation({
    mutationFn: () => api.createVpnConfig(accessToken!),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["vpn-configs"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Не удалось создать VPN-конфиг"),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.revokeVpnConfig(accessToken!, id),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["vpn-configs"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Не удалось отозвать VPN-конфиг"),
  });

  const downloadMutation = useMutation({
    mutationFn: async (config: VpnConfig) => {
      const blob = await api.downloadVpnConfig(accessToken!, config.id);
      saveBlob(blob, `ghostgate-${config.id}.conf`);
    },
    onSuccess: () => setError(null),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Не удалось скачать VPN-конфиг"),
  });

  const activeConfigs = useMemo(
    () => (configsQuery.data ?? []).filter((config) => config.status === "active"),
    [configsQuery.data],
  );
  const plan = plansQuery.data?.[0];
  const maxConfigs = plan?.max_configs ?? 1;
  const canCreate = activeConfigs.length < maxConfigs && !createMutation.isPending;
  const remainingDays = daysUntil(subscriptionQuery.data?.expires_at);

  return (
    <div>
      <SectionHeader title="Главная" subtitle="Управляйте пробной подпиской и VPN-конфигурацией." />
      {error ? <div className="mb-5"><Alert>{error}</Alert></div> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Подписка</h2>
              <p className="mt-1 text-sm text-muted">Пробный доступ включает один активный VPN-конфиг.</p>
            </div>
            {subscriptionQuery.data ? (
              <span className={`badge ${statusTone(subscriptionQuery.data.status)}`}>{statusLabel(subscriptionQuery.data.status)}</span>
            ) : null}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-line bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase text-muted">Действует до</div>
              <div className="mt-2 text-sm font-semibold">{formatDate(subscriptionQuery.data?.expires_at)}</div>
            </div>
            <div className="rounded-md border border-line bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase text-muted">Осталось</div>
              <div className="mt-2 text-sm font-semibold">{remainingDays === null ? "Неизвестно" : `${Math.max(remainingDays, 0)} дн.`}</div>
            </div>
            <div className="rounded-md border border-line bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase text-muted">Конфиги</div>
              <div className="mt-2 text-sm font-semibold">
                {activeConfigs.length}/{maxConfigs}
              </div>
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-base font-semibold">Состояние аккаунта</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Email</span>
              <span className="truncate font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Подтверждение</span>
              <span className={`badge ${user?.is_email_verified ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                {user?.is_email_verified ? "подтвержден" : "ожидает"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Роль</span>
              <span className="font-medium">{roleLabel(user?.role)}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="panel mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">VPN-конфиги</h2>
            <p className="mt-1 text-sm text-muted">Тело конфига запрашивается у awg-server только при скачивании.</p>
          </div>
          <button className="btn btn-primary" onClick={() => createMutation.mutate()} disabled={!canCreate}>
            <Plus className="h-4 w-4" />
            Создать конфиг
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-md border border-line">
          <div className="grid grid-cols-12 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-muted">
            <div className="col-span-5">Конфиг</div>
            <div className="col-span-2">Статус</div>
            <div className="col-span-3">Действует до</div>
            <div className="col-span-2 text-right">Действия</div>
          </div>
          {(configsQuery.data ?? []).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">VPN-конфигов пока нет.</div>
          ) : (
            (configsQuery.data ?? []).map((config) => (
              <div key={config.id} className="grid grid-cols-12 items-center gap-2 border-t border-line px-4 py-3 text-sm">
                <div className="col-span-12 min-w-0 sm:col-span-5">
                  <div className="truncate font-medium">{config.id}</div>
                  <div className="truncate text-xs text-muted">AWG {config.awg_client_id}</div>
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <span className={`badge ${statusTone(config.status)}`}>{statusLabel(config.status)}</span>
                </div>
                <div className="col-span-5 text-muted sm:col-span-3">{formatDate(config.expires_at)}</div>
                <div className="col-span-3 flex justify-end gap-2 sm:col-span-2">
                  <button
                    className="btn btn-secondary h-9 px-3"
                    title="Скачать конфиг"
                    onClick={() => downloadMutation.mutate(config)}
                    disabled={config.status !== "active" || downloadMutation.isPending}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    className="btn btn-secondary h-9 px-3"
                    title="Отозвать конфиг"
                    onClick={() => revokeMutation.mutate(config.id)}
                    disabled={["revoked", "expired"].includes(config.status) || revokeMutation.isPending}
                  >
                    {revokeMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
