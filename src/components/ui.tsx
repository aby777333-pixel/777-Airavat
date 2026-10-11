import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

export function SimBadge({ label = "Simulated data" }: { label?: string }) {
  return <span className="badge badge-sim" title="Synthetic sandbox data. Not live market prices.">● {label}</span>;
}

export function Badge({ children, tone = "default", className }: { children: ReactNode; tone?: "default" | "ok" | "bad" | "info" | "sim" | "accent"; className?: string }) {
  const map = { default: "", ok: "badge-ok", bad: "badge-bad", info: "badge-info", sim: "badge-sim", accent: "badge-accent" };
  return <span className={clsx("badge", map[tone], className)}>{children}</span>;
}

export function statusTone(status: string): "ok" | "bad" | "info" | "default" | "sim" {
  if (["FILLED", "COMPLETED", "approved", "active", "APPROVED"].includes(status)) return "ok";
  if (["RMS_REJECTED", "REJECTED", "CANCELLED", "EXPIRED", "rejected", "frozen", "closed"].includes(status)) return "bad";
  if (["ACKNOWLEDGED", "PARTIALLY_FILLED", "PENDING", "under_review", "ROUTED"].includes(status)) return "info";
  return "default";
}

export function Card({ children, className, title, action, subtitle }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; subtitle?: ReactNode }) {
  return (
    <section className={clsx("glass p-5", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-base font-semibold">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "profit" | "loss" | "default" }) {
  return (
    <div className="glass p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className={clsx("tnum mt-1 font-display text-2xl font-semibold", tone === "profit" && "text-profit", tone === "loss" && "text-loss")}>{value}</div>
      {sub && <div className="mt-1 text-xs text-faint">{sub}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, eyebrow }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent">{eyebrow}</div>}
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ title, body, cta }: { title: string; body?: string; cta?: { href: string; label: string } }) {
  return (
    <div className="glass p-8 text-center">
      <div className="font-display text-lg font-semibold">{title}</div>
      {body && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>}
      {cta && <Link href={cta.href} className="btn btn-primary mt-4">{cta.label}</Link>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "bad" | "ok"; children: ReactNode }) {
  const map = {
    info: "border-info/40 bg-info/10 text-info",
    warn: "border-warn/40 bg-warn/10 text-warn",
    bad: "border-loss/40 bg-loss/10 text-loss",
    ok: "border-profit/40 bg-profit/10 text-profit",
  };
  return <div className={clsx("rounded-xl border px-4 py-3 text-sm", map[tone])}>{children}</div>;
}

export function SandboxBanner() {
  return (
    <div className="border-b border-warn/30 bg-warn/10 px-4 py-2 text-center text-xs font-medium text-warn">
      SANDBOX ENVIRONMENT — simulated market data, simulated funds, no exchange, bank or depository connectivity. Not a licensed brokerage.
    </div>
  );
}
