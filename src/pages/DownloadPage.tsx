import { useMutation } from "@tanstack/react-query";
import { Apple, Download, LogOut, Smartphone } from "lucide-react";
import { useState } from "react";

import { ApiError, api } from "../api/client";
import { useAuth } from "../state/auth";
import { Alert } from "../ui/Alert";

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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const blob = await api.createAndDownloadVpnConfig(accessToken!);
      saveBlob(blob, "ghostgate.conf");
    },
    onSuccess: () => {
      setError(null);
      setMessage("Конфиг скачан. Импортируйте файл в приложение AmneziaWG.");
    },
    onError: (err) => {
      setMessage(null);
      setError(err instanceof ApiError ? err.message : "Не удалось скачать VPN-конфиг");
    },
  });

  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-ink">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-3xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">GhostGateVPN</div>
            <div className="mt-1 max-w-[220px] truncate text-sm text-muted sm:max-w-none">{user?.email}</div>
          </div>
          <button className="btn btn-secondary" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </header>

        <section className="flex flex-1 items-center py-10">
          <div className="w-full">
            <div className="panel p-6 sm:p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-brand-600 text-white">
                <Download className="h-7 w-7" />
              </div>
              <div className="mx-auto mt-6 max-w-xl text-center">
                <h1 className="text-3xl font-semibold tracking-normal text-ink">Скачать VPN-конфиг</h1>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Нажмите кнопку ниже. Мы создадим конфиг, если его еще нет, или скачиваем уже активный файл.
                </p>
              </div>

              <div className="mx-auto mt-6 max-w-md space-y-3">
                {error ? <Alert>{error}</Alert> : null}
                {message ? <Alert tone="success">{message}</Alert> : null}
                <button className="btn btn-primary h-12 w-full" onClick={() => downloadMutation.mutate()} disabled={downloadMutation.isPending}>
                  <Download className="h-5 w-5" />
                  {downloadMutation.isPending ? "Готовим конфиг..." : "Скачать конфиг"}
                </button>
              </div>
            </div>

            <section className="mt-5">
              <h2 className="text-base font-semibold">Установите приложение</h2>
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
          </div>
        </section>
      </div>
    </main>
  );
}

