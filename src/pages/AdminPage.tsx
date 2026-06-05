import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useState } from "react";

import { ApiError, api } from "../api/client";
import { formatDate, roleLabel, statusLabel, statusTone } from "../lib/format";
import { useAuth } from "../state/auth";
import type { User, UserRole } from "../types";
import { Alert } from "../ui/Alert";
import { SectionHeader } from "../ui/SectionHeader";

export function AdminPage() {
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.adminUsers(accessToken!),
    enabled: Boolean(accessToken && (user?.role === "admin" || user?.role === "support")),
  });
  const configsQuery = useQuery({
    queryKey: ["admin-configs"],
    queryFn: () => api.adminConfigs(accessToken!),
    enabled: Boolean(accessToken && (user?.role === "admin" || user?.role === "support")),
  });
  const subscriptionsQuery = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: () => api.adminSubscriptions(accessToken!),
    enabled: Boolean(accessToken && (user?.role === "admin" || user?.role === "support")),
  });

  const patchUserMutation = useMutation({
    mutationFn: ({ target, role, isActive }: { target: User; role: UserRole; isActive: boolean }) =>
      api.patchUser(accessToken!, target.id, { role, is_active: isActive }),
    onSuccess: async () => {
      setError(null);
      setMessage("Пользователь обновлен.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => {
      setMessage(null);
      setError(err instanceof ApiError ? err.message : "Не удалось обновить пользователя");
    },
  });

  if (user?.role !== "admin" && user?.role !== "support") {
    return (
      <div>
        <SectionHeader title="Админ" />
        <Alert>У вас нет доступа к этому разделу.</Alert>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Админ" subtitle="Просмотр состояния сервиса и управление пользователями." />
      <div className="mb-5 space-y-3">
        {error ? <Alert>{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}
      </div>

      <section className="panel p-5">
        <h2 className="text-base font-semibold">Пользователи</h2>
        <div className="mt-4 overflow-hidden rounded-md border border-line">
          {(usersQuery.data ?? []).map((target) => (
            <AdminUserRow
              key={target.id}
              user={target}
              canEdit={user.role === "admin"}
              saving={patchUserMutation.isPending}
              onSave={(role, isActive) => patchUserMutation.mutate({ target, role, isActive })}
            />
          ))}
          {(usersQuery.data ?? []).length === 0 ? <div className="p-5 text-sm text-muted">Пользователи не найдены.</div> : null}
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-base font-semibold">Конфиги</h2>
          <div className="mt-4 space-y-3">
            {(configsQuery.data ?? []).slice(0, 20).map((config) => (
              <div key={config.id} className="rounded-md border border-line p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium">{config.id}</span>
                  <span className={`badge ${statusTone(config.status)}`}>{statusLabel(config.status)}</span>
                </div>
                <div className="mt-2 text-xs text-muted">Действует до {formatDate(config.expires_at)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-base font-semibold">Подписки</h2>
          <div className="mt-4 space-y-3">
            {(subscriptionsQuery.data ?? []).slice(0, 20).map((subscription) => (
              <div key={subscription.id} className="rounded-md border border-line p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium">{subscription.id}</span>
                  <span className={`badge ${statusTone(subscription.status)}`}>{statusLabel(subscription.status)}</span>
                </div>
                <div className="mt-2 text-xs text-muted">Действует до {formatDate(subscription.expires_at)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function AdminUserRow({
  user,
  canEdit,
  saving,
  onSave,
}: {
  user: User;
  canEdit: boolean;
  saving: boolean;
  onSave: (role: UserRole, isActive: boolean) => void;
}) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [isActive, setIsActive] = useState(user.is_active);

  return (
    <div className="grid gap-3 border-t border-line p-4 first:border-t-0 md:grid-cols-[1fr_140px_120px_48px] md:items-center">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{user.email}</div>
        <div className="text-xs text-muted">Создан {formatDate(user.created_at)}</div>
      </div>
      <select className="field h-10" value={role} onChange={(event) => setRole(event.target.value as UserRole)} disabled={!canEdit}>
        <option value="user">{roleLabel("user")}</option>
        <option value="support">{roleLabel("support")}</option>
        <option value="admin">{roleLabel("admin")}</option>
      </select>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={!canEdit} />
        Активен
      </label>
      <button className="btn btn-secondary h-10 px-3" disabled={!canEdit || saving} onClick={() => onSave(role, isActive)} title="Сохранить пользователя">
        <Save className="h-4 w-4" />
      </button>
    </div>
  );
}
