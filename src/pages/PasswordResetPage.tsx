import { useState } from "react";
import { Link } from "react-router-dom";

import { ApiError, api } from "../api/client";
import { Alert } from "../ui/Alert";
import { AuthShell } from "../ui/AuthShell";

export function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestReset(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await api.requestPasswordReset(email);
      setMessage("Запрос на сброс пароля отправлен. Проверьте почту и скопируйте токен.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось запросить сброс пароля");
    } finally {
      setLoading(false);
    }
  }

  async function confirmReset(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await api.confirmPasswordReset(token, password);
      setMessage("Пароль обновлен. Теперь можно войти с новым паролем.");
      setToken("");
      setPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сбросить пароль");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Сброс пароля"
      subtitle="Запросите токен по email, затем задайте новый пароль."
      footer={
        <Link className="font-medium text-brand-700" to="/login">
          Вернуться ко входу
        </Link>
      }
    >
      <div className="space-y-6">
        {error ? <Alert>{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}
        <form className="space-y-4" onSubmit={requestReset}>
          <div className="space-y-2">
            <label className="label" htmlFor="reset-email">
            Email
            </label>
            <input id="reset-email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button className="btn btn-secondary w-full" disabled={loading}>
            Запросить токен
          </button>
        </form>
        <div className="border-t border-line" />
        <form className="space-y-4" onSubmit={confirmReset}>
          <div className="space-y-2">
            <label className="label" htmlFor="reset-token">
              Токен
            </label>
            <input id="reset-token" className="field" value={token} onChange={(e) => setToken(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="label" htmlFor="new-password">
              Новый пароль
            </label>
            <input
              id="new-password"
              className="field"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary w-full" disabled={loading}>
            Сохранить новый пароль
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
