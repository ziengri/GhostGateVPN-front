import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ApiError, api } from "../api/client";
import { useAuth } from "../state/auth";
import { Alert } from "../ui/Alert";
import { AuthShell } from "../ui/AuthShell";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const { refreshUser } = useAuth();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Подтверждаем email...");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setState("error");
      setMessage("Токен подтверждения отсутствует.");
      return;
    }
    api
      .verifyEmailGet(token)
      .then(async () => {
        await refreshUser();
        setState("success");
        setMessage("Email подтвержден.");
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof ApiError ? err.message : "Не удалось подтвердить email.");
      });
  }, [params, refreshUser]);

  return (
    <AuthShell
      title="Подтверждение email"
      subtitle="Ссылка подтверждения обрабатывается backend-сервисом."
      footer={
        <Link className="font-medium text-brand-700" to="/app">
          Вернуться в кабинет
        </Link>
      }
    >
      <Alert tone={state === "success" ? "success" : state === "loading" ? "info" : "error"}>{message}</Alert>
    </AuthShell>
  );
}
