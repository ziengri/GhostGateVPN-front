import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, History, LogOut, Send, Wallet } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { ApiError, api } from "../api/client";
import { useAuth } from "../state/auth";
import { Alert } from "../ui/Alert";
import type { BalanceTransaction, Plan, Subscription } from "../types";

const REASON_LABELS: Record<string, string> = {
  topup: "Пополнение",
  purchase: "Покупка тарифа",
  adjustment: "Корректировка",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatMoney(amount: number): string {
  return `${amount > 0 ? "+" : ""}${amount.toLocaleString("ru-RU")} ₽`;
}

function pluralDays(days: number): string {
  const mod10 = days % 10;
  const mod100 = days % 100;
  if (mod10 === 1 && mod100 !== 11) return `${days} день`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${days} дня`;
  return `${days} дней`;
}

function pluralDevices(count: number): string {
  if (count === 1) return "1 устройство";
  if (count >= 2 && count <= 4) return `${count} устройства`;
  return `${count} устройств`;
}

function useSubscription(token: string | null) {
  return useQuery<Subscription | null>({
    queryKey: ["subscription"],
    queryFn: async () => {
      try {
        return await api.getCurrentSubscription(token!);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
    enabled: Boolean(token),
  });
}

function SubscriptionSection({ token }: { token: string }) {
  const { data: subscription, isLoading } = useSubscription(token);
  const { data: plans } = useQuery({ queryKey: ["plans"], queryFn: () => api.getPlans() });

  if (isLoading) return <p className="text-sm text-muted">Загружаем подписку...</p>;

  if (!subscription) {
    return (
      <Alert tone="info">
        Активной подписки нет. Выберите тариф ниже — конфиги станут доступны сразу после покупки.
      </Alert>
    );
  }

  const planName = plans?.find((plan) => plan.id === subscription.plan_id)?.name ?? "Тариф";
  const badge =
    subscription.status === "trial" ? "Trial" : subscription.status === "active" ? "Активна" : subscription.status;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-ink">{planName}</span>
          <span className="badge border-brand-200 bg-brand-50 text-brand-700">{badge}</span>
        </div>
        <p className="mt-1 text-sm text-muted">активна до {formatDate(subscription.expires_at)}</p>
      </div>
    </div>
  );
}

function PlansSection({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery({ queryKey: ["plans"], queryFn: () => api.getPlans() });
  const paidPlans = (plans ?? []).filter((plan) => plan.is_active && plan.price_amount > 0);

  const purchaseMutation = useMutation({
    mutationFn: (plan: Plan) => api.purchasePlan(token, plan.id),
    onSuccess: (result) => {
      setError(null);
      setMessage(`Тариф оплачен. Подписка активна до ${formatDate(result.subscription.expires_at)}.`);
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
      void queryClient.invalidateQueries({ queryKey: ["balance"] });
    },
    onError: (err) => {
      setMessage(null);
      setError(err instanceof ApiError ? err.message : "Не удалось оплатить тариф");
    },
  });

  function buy(plan: Plan) {
    if (!window.confirm(`Списать ${formatMoney(plan.price_amount)} за тариф «${plan.name}»?`)) return;
    purchaseMutation.mutate(plan);
  }

  if (isLoading) return <p className="text-sm text-muted">Загружаем тарифы...</p>;

  return (
    <div className="space-y-3">
      {error ? <Alert>{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {paidPlans.map((plan) => (
          <div key={plan.id} className="panel flex flex-col p-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-base font-semibold text-ink">{plan.name}</span>
              <span className="text-lg font-bold text-brand-700">{formatMoney(plan.price_amount)}</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {pluralDays(plan.duration_days)} · до {pluralDevices(plan.max_configs)}
            </p>
            <button
              className="btn btn-primary mt-4 w-full"
              onClick={() => buy(plan)}
              disabled={purchaseMutation.isPending}
            >
              {purchaseMutation.isPending ? "Оплачиваем..." : "Купить"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BalanceSection({ token }: { token: string }) {
  const [showHistory, setShowHistory] = useState(false);
  const { data: balance } = useQuery({ queryKey: ["balance"], queryFn: () => api.getBalance(token) });
  const { data: transactions } = useQuery({
    queryKey: ["balance", "transactions"],
    queryFn: () => api.getBalanceTransactions(token),
    enabled: showHistory,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-bold text-ink">{balance ? formatMoney(balance.balance) : "..."}</div>
          <p className="mt-1 text-sm text-muted">Баланс аккаунта</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowHistory((value) => !value)}>
          <History className="h-4 w-4" />
          {showHistory ? "Скрыть историю" : "История"}
        </button>
      </div>
      {showHistory ? (
        <div className="divide-y divide-slate-100 rounded-md border border-line">
          {(transactions ?? []).length === 0 ? (
            <p className="p-3 text-sm text-muted">Операций пока нет</p>
          ) : (
            (transactions ?? []).map((transaction: BalanceTransaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <div className="text-sm font-medium text-ink">{REASON_LABELS[transaction.reason] ?? transaction.reason}</div>
                  <div className="text-xs text-muted">{formatDateTime(transaction.created_at)}</div>
                </div>
                <div className={transaction.amount >= 0 ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-ink"}>
                  {formatMoney(transaction.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function TelegramSection({ token }: { token: string }) {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const linkMutation = useMutation({
    mutationFn: () => api.linkTelegram(token),
    onSuccess: (result) => {
      setError(null);
      setLinkCode(result.code);
      setExpiresAt(result.expires_at);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Не удалось получить код"),
  });

  const unlinkMutation = useMutation({
    mutationFn: () => api.unlinkTelegram(token),
    onSuccess: async () => {
      setError(null);
      setLinkCode(null);
      await refreshUser();
      void queryClient.invalidateQueries({ queryKey: ["balance"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Не удалось отвязать Telegram"),
  });

  return (
    <div className="space-y-3">
      {error ? <Alert>{error}</Alert> : null}
      {user?.tgid ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">Привязан</span>
            <p className="mt-1 text-sm text-muted">Telegram ID: {user.tgid}</p>
          </div>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm("Отвязать Telegram от аккаунта?")) unlinkMutation.mutate();
            }}
            disabled={unlinkMutation.isPending}
          >
            {unlinkMutation.isPending ? "Отвязываем..." : "Отвязать"}
          </button>
        </div>
      ) : linkCode ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">Отправьте боту команду:</p>
          <code className="block rounded-md bg-slate-900 px-4 py-3 text-base font-semibold tracking-wider text-white">
            /start {linkCode}
          </code>
          <p className="text-xs text-muted">Код действует до {formatDateTime(expiresAt!)}</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Привяжите Telegram, чтобы получать уведомления.</p>
          <button className="btn btn-secondary" onClick={() => linkMutation.mutate()} disabled={linkMutation.isPending}>
            <Send className="h-4 w-4" />
            {linkMutation.isPending ? "Готовим код..." : "Получить код привязки"}
          </button>
        </div>
      )}
    </div>
  );
}

export function AccountPage() {
  const { accessToken, user, logout } = useAuth();

  if (!accessToken) return null;

  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-ink">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link className="btn btn-secondary px-3" to="/app" aria-label="К конфигу">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="text-lg font-semibold">Аккаунт</div>
              <div className="mt-0.5 max-w-[220px] truncate text-sm text-muted sm:max-w-none">{user?.email}</div>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </header>

        <section className="panel p-6">
          <h2 className="text-base font-semibold">Подписка</h2>
          <div className="mt-4">
            <SubscriptionSection token={accessToken} />
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="text-base font-semibold">Тарифы</h2>
          <div className="mt-4">
            <PlansSection token={accessToken} />
          </div>
        </section>

        <section className="panel p-6">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-brand-600" />
            <h2 className="text-base font-semibold">Баланс</h2>
          </div>
          <div className="mt-4">
            <BalanceSection token={accessToken} />
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="text-base font-semibold">Telegram</h2>
          <div className="mt-4">
            <TelegramSection token={accessToken} />
          </div>
        </section>
      </div>
    </main>
  );
}
