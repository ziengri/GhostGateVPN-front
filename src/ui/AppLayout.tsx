import { LayoutDashboard, LogOut, Settings, ShieldCheck, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { roleLabel } from "../lib/format";
import { useAuth } from "../state/auth";

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition",
    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-ink",
  ].join(" ");
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const canSeeAdmin = user?.role === "admin" || user?.role === "support";

  return (
    <div className="min-h-screen bg-surface text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white px-4 py-5 md:block">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-semibold">GhostGateVPN</div>
            <div className="text-xs text-muted">Личный кабинет</div>
          </div>
        </div>
        <nav className="space-y-1">
          <NavLink to="/app" end className={navClass}>
            <LayoutDashboard className="h-4 w-4" />
            Главная
          </NavLink>
          <NavLink to="/app/account" className={navClass}>
            <Settings className="h-4 w-4" />
            Аккаунт
          </NavLink>
          {canSeeAdmin ? (
            <NavLink to="/app/admin" className={navClass}>
              <Users className="h-4 w-4" />
              Админ
            </NavLink>
          ) : null}
        </nav>
        <button className="btn btn-secondary absolute bottom-5 left-4 right-4" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 border-b border-line bg-white/90 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between px-4 md:px-8">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{user?.email}</p>
              <p className="text-xs text-muted">{roleLabel(user?.role)}</p>
            </div>
            <button className="btn btn-secondary md:hidden" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-3 md:hidden">
            <NavLink to="/app" end className={navClass}>
              Главная
            </NavLink>
            <NavLink to="/app/account" className={navClass}>
              Аккаунт
            </NavLink>
            {canSeeAdmin ? (
              <NavLink to="/app/admin" className={navClass}>
                Админ
              </NavLink>
            ) : null}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
