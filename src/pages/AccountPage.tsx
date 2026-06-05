import { useQuery } from "@tanstack/react-query";

import { api } from "../api/client";
import { formatDate, roleLabel } from "../lib/format";
import { useAuth } from "../state/auth";
import { SectionHeader } from "../ui/SectionHeader";

export function AccountPage() {
  const { accessToken, user, refreshUser } = useAuth();
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      await refreshUser();
      return api.me(accessToken!);
    },
    enabled: Boolean(accessToken),
  });
  const currentUser = meQuery.data ?? user;

  return (
    <div>
      <SectionHeader title="Аккаунт" subtitle="Состояние аккаунта и параметры безопасности." />
      <section className="panel max-w-3xl p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-line bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase text-muted">Email</div>
            <div className="mt-2 break-words text-sm font-semibold">{currentUser?.email}</div>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase text-muted">Статус email</div>
            <div className="mt-2 text-sm font-semibold">{currentUser?.is_email_verified ? "подтвержден" : "не подтвержден"}</div>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase text-muted">Роль</div>
            <div className="mt-2 text-sm font-semibold">{roleLabel(currentUser?.role)}</div>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase text-muted">Создан</div>
            <div className="mt-2 text-sm font-semibold">{formatDate(currentUser?.created_at)}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
