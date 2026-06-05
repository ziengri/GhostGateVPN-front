import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError, api } from "../api/client";
import { Alert } from "../ui/Alert";
import { AuthShell } from "../ui/AuthShell";
import { useAuth } from "../state/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await api.login(email, password);
      setSession(session);
      navigate("/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Вход"
      subtitle="Управляйте подпиской и VPN-конфигурацией."
      footer={
        <>
          Нет аккаунта?{" "}
          <Link className="font-medium text-brand-700" to="/register">
            Зарегистрироваться
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        {error ? <Alert>{error}</Alert> : null}
        <div className="space-y-2">
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="label" htmlFor="password">
              Пароль
            </label>
            <Link className="text-sm font-medium text-brand-700" to="/password-reset">
              Сбросить
            </Link>
          </div>
          <input
            id="password"
            className="field"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Входим..." : "Войти"}
        </button>
      </form>
    </AuthShell>
  );
}
