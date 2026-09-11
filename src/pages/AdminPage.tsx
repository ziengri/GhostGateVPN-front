import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { ApiError, api } from "../api/client";
import { useAuth } from "../state/auth";
import { Alert } from "../ui/Alert";
import type { Subscription, User, VpnConfig } from "../types";

const ROLE_LABELS: Record<User["role"], string> = {
  user: "Пользователь",
  support: "Поддержка",
  admin: "Админ",
};

const ROLE_BADGE: Record<User["role"], string> = {
  user: "border-slate-200 bg-slate-100 text-slate-600",
  support: "border-sky-200 bg-sky-50 text-sky-700",
  admin: "border-violet-200 bg-violet-50 text-violet-700",
};

const SUB_LABELS: Record<Subscription["status"], string> = {
  active: "Активна",
  trial: "Trial",
  expired: "Истекла",
  cancelled: "Отменена",
};

const SUB_BADGE: Record<Subscription["status"], string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  trial: "border-sky-200 bg-sky-50 text-sky-700",
  expired: "border-slate-200 bg-slate-100 text-slate-600",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
};

const CONFIG_LABELS: Record<VpnConfig["status"], string> = {
  active: "Активен",
  pending_revoke: "Отзывается",
  expired: "Истёк",
  revoked: "Отозван",
  failed: "Ошибка",
};

const CONFIG_BADGE: Record<VpnConfig["status"], string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending_revoke: "border-amber-200 bg-amber-50 text-amber-700",
  expired: "border-slate-200 bg-slate-100 text-slate-600",
  revoked: "border-slate-200 bg-slate-100 text-slate-600",
  failed: "border-red-200 bg-red-50 text-red-700",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "numeric", year: "numeric" });
}

const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted";
const td = "px-3 py-2 text-sm text-ink";

export function AdminPage() {
  const { accessToken, user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const isStaff = user?.role === "admin" || user?.role === "support";
  const isAdmin = user?.role === "admin";

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.getAdminUsers(accessToken!),
    enabled: Boolean(accessToken) && Boolean(isStaff),
  });
  const { data: subscriptions } = useQuery({
    queryKey: ["admin-subs"],
    queryFn: () => api.getAdminSubscriptions(accessToken!),
    enabled: Boolean(accessToken) && Boolean(isStaff),
  });
  const { data: configs } = useQuery({
    queryKey: ["admin-configs"],
    queryFn: () => api.getAdminConfigs(accessToken!),
    enabled: Boolean(accessToken) && Boolean(isStaff),
  });

  function handleError(err: unknown, fallback: string) {
    setMessage(null);
    setError(err instanceof ApiError ? err.message : fallback);
  }

  const toggleActive = useMutation({
    mutationFn: (target: User) => api.patchAdminUser(accessToken!, target.id, { is_active: !target.is_active }),
    onSuccess: (updated) => {
      setError(null);
      setMessage(updated.is_active ? `Пользователь ${updated.email} разблокирован` : `Пользователь ${updated.email} заблокирован`);
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => handleError(err, "Не удалось изменить пользователя"),
  });

  const adjustBalance = useMutation({
    mutationFn: ({ target, amount }: { target: User; amount: number }) => api.adjustUserBalance(accessToken!, target.id, amount),
    onSuccess: (data, { target }) => {
      setError(null);
      setMessage(`Баланс ${target.email} обновлён: ${data.balance.toLocaleString("ru-RU")} ₽`);
      setAmounts((prev) => ({ ...prev, [target.id]: "" }));
    },
    onError: (err) => handleError(err, "Не удалось изменить баланс"),
  });

  const revokeConfig = useMutation({
    mutationFn: (config: VpnConfig) => api.revokeAdminConfig(accessToken!, config.id),
    onSuccess: () => {
      setError(null);
      setMessage("Конфиг отозван");
      void queryClient.invalidateQueries({ queryKey: ["admin-configs"] });
    },
    onError: (err) => handleError(err, "Не удалось отозвать конфиг"),
  });

  if (!isStaff) return <Navigate to="/app" replace />;

  const emailOf = (id: string) => users?.find((candidate) => candidate.id === id)?.email ?? `${id.slice(0, 8)}…`;
  const busy = toggleActive.isPending || adjustBalance.isPending || revokeConfig.isPending;

  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-ink">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="h-5 w-5 text-brand-600" />
              Админ-панель
            </div>
            <div className="mt-1 text-sm text-muted">{user?.email}</div>
          </div>
          <Link className="btn btn-secondary" to="/app">
            <ArrowLeft className="h-4 w-4" />
            К конфигам
          </Link>
        </header>

        {error ? <Alert>{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}

        <section className="panel overflow-x-auto p-4">
          <h2 className="text-base font-semibold">Пользователи</h2>
          <table className="mt-3 w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-line">
                <th className={th}>Email</th>
                <th className={th}>Роль</th>
                <th className={th}>Статус</th>
                <th className={th}>Создан</th>
                <th className={th}>Баланс, ₽</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className={td}>
                    <div className="font-medium">{row.email}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {!row.is_email_verified ? "email не подтверждён" : `tgid: ${row.tgid ?? "—"}`}
                    </div>
                  </td>
                  <td className={td}>
                    <span className={`badge ${ROLE_BADGE[row.role]}`}>{ROLE_LABELS[row.role]}</span>
                  </td>
                  <td className={td}>
                    <span className={`badge ${row.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                      {row.is_active ? "Активен" : "Заблокирован"}
                    </span>
                  </td>
                  <td className={`${td} whitespace-nowrap text-muted`}>{formatDate(row.created_at)}</td>
                  <td className={td}>
                    {isAdmin ? (
                      <div className="flex items-center gap-1">
                        <input
                          className="w-24 rounded-md border border-line bg-white px-2 py-1 text-sm"
                          type="number"
                          placeholder="±500"
                          value={amounts[row.id] ?? ""}
                          onChange={(event) => setAmounts((prev) => ({ ...prev, [row.id]: event.target.value }))}
                        />
                        <button
                          className="btn btn-secondary px-2 py-1 text-xs"
                          disabled={busy || !amounts[row.id] || Number(amounts[row.id]) === 0}
                          onClick={() => adjustBalance.mutate({ target: row, amount: Number(amounts[row.id]) })}
                        >
                          ОК
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`${td} text-right`}>
                    {isAdmin ? (
                      <button
                        className="btn btn-secondary px-2 py-1 text-xs"
                        disabled={busy}
                        onClick={() => toggleActive.mutate(row)}
                      >
                        <Ban className="h-3.5 w-3.5" />
                        {row.is_active ? "Блок" : "Разблок"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel overflow-x-auto p-4">
          <h2 className="text-base font-semibold">Подписки</h2>
          <table className="mt-3 w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-line">
                <th className={th}>Пользователь</th>
                <th className={th}>Статус</th>
                <th className={th}>Начало</th>
                <th className={th}>Действует до</th>
              </tr>
            </thead>
            <tbody>
              {(subscriptions ?? []).map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className={td}>{emailOf(row.user_id)}</td>
                  <td className={td}>
                    <span className={`badge ${SUB_BADGE[row.status]}`}>{SUB_LABELS[row.status]}</span>
                  </td>
                  <td className={`${td} whitespace-nowrap text-muted`}>{formatDate(row.starts_at)}</td>
                  <td className={`${td} whitespace-nowrap text-muted`}>{formatDate(row.expires_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel overflow-x-auto p-4">
          <h2 className="text-base font-semibold">Конфиги</h2>
          <table className="mt-3 w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-line">
                <th className={th}>Конфиг</th>
                <th className={th}>Пользователь</th>
                <th className={th}>Статус</th>
                <th className={th}>Действует до</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {(configs ?? []).map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className={`${td} font-mono text-xs`}>{row.id.slice(0, 8)}</td>
                  <td className={td}>{emailOf(row.user_id)}</td>
                  <td className={td}>
                    <span className={`badge ${CONFIG_BADGE[row.status]}`}>{CONFIG_LABELS[row.status]}</span>
                  </td>
                  <td className={`${td} whitespace-nowrap text-muted`}>{formatDate(row.expires_at)}</td>
                  <td className={`${td} text-right`}>
                    {isAdmin && row.status === "active" ? (
                      <button
                        className="btn btn-secondary px-2 py-1 text-xs"
                        disabled={busy}
                        onClick={() => revokeConfig.mutate(row)}
                      >
                        Отозвать
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
