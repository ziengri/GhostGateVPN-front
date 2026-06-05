import { AlertCircle, CheckCircle2 } from "lucide-react";

export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-brand-100 bg-brand-50 text-brand-700",
  };
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${styles[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

