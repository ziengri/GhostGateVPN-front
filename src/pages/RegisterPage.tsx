import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError, api } from "../api/client";
import { useAuth } from "../state/auth";
import { Alert } from "../ui/Alert";
import { AuthShell } from "../ui/AuthShell";

export function RegisterPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!/^\+7\d{10}$/.test(phoneNumber)) {
      setError("Телефон должен быть в формате +70000000000");
      return;
    }
    setLoading(true);
    try {
      const session = await api.register(email, phoneNumber, password);
      setSession(session);
      navigate("/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось зарегистрироваться");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Регистрация"
      subtitle="Получите пробный период на 14 дней и создайте один активный VPN-конфиг."
      footer={
        <>
          Уже есть аккаунт?{" "}
          <Link className="font-medium text-brand-700" to="/login">
            Войти
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
          <label className="label" htmlFor="phone">
            Телефон
          </label>
          <input
            id="phone"
            className="field"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+70000000000"
            pattern="^\+7[0-9]{10}$"
            title="Телефон должен быть в формате +70000000000"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.trim())}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="label" htmlFor="password">
            Пароль
          </label>
          <input
            id="password"
            className="field"
            type="password"
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Создаем..." : "Создать аккаунт"}
        </button>
      </form>
    </AuthShell>
  );
}
