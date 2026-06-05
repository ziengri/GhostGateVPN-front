import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <section className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center gap-3 text-ink">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold">GhostGateVPN</span>
        </Link>
        <div className="panel p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-normal text-ink">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>
          </div>
          {children}
        </div>
        {footer ? <div className="mt-5 text-center text-sm text-muted">{footer}</div> : null}
      </section>
    </main>
  );
}

