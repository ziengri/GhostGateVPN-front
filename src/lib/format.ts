export function formatDate(value: string | null | undefined): string {
  if (!value) return "Не задано";
  return new Intl.DateTimeFormat("ru-RU", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export function statusTone(status: string): string {
  if (["active", "trial"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "pending_revoke") return "border-amber-200 bg-amber-50 text-amber-800";
  if (["expired", "revoked", "cancelled"].includes(status)) return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-red-200 bg-red-50 text-red-800";
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "активен",
    trial: "пробный период",
    pending_revoke: "ожидает отзыва",
    expired: "истек",
    revoked: "отозван",
    cancelled: "отменен",
    failed: "ошибка",
  };
  return labels[status] ?? status;
}

export function roleLabel(role: string | null | undefined): string {
  const labels: Record<string, string> = {
    user: "пользователь",
    support: "поддержка",
    admin: "администратор",
  };
  return role ? labels[role] ?? role : "не задано";
}
