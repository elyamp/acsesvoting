import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-line bg-card/80 backdrop-blur-xl shadow-card transition-shadow hover:shadow-lg ${className.includes("p-") || className.includes("p-0") ? className : `p-6 ${className}`}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent dark:from-white/2 pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const tones: Record<string, string> = {
    slate: "bg-surface text-muted border-line",
    green: "bg-accent-soft text-accent border-accent-line",
    amber: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
    red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
    blue: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

const fieldClasses =
  "w-full rounded-xl border border-line bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-faint outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/12";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClasses} ${props.className || ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClasses} ${props.className || ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldClasses} ${props.className || ""}`} />;
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
      {children}
    </label>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const variants = {
    primary:
      "bg-accent hover:bg-[color-mix(in_srgb,var(--accent)_88%,black)] text-white shadow-md shadow-accent/20 hover:shadow-lg hover:shadow-accent/25 hover:-translate-y-px disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-md dark:text-background",
    secondary:
      "border border-line bg-card hover:bg-surface hover:border-faint text-foreground shadow-sm hover:-translate-y-px disabled:hover:translate-y-0",
    danger:
      "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30 hover:-translate-y-px disabled:bg-red-600/40 disabled:hover:translate-y-0 disabled:hover:shadow-none dark:bg-red-500 dark:hover:bg-red-400 dark:text-red-950 dark:shadow-red-500/20 dark:disabled:bg-red-500/30 dark:disabled:text-red-950/50",
    ghost: "hover:bg-surface text-muted hover:text-foreground",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] ${variants[variant]} ${className}`}
    />
  );
}

export function Alert({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  const kinds = {
    error: "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    success: "border-accent-line bg-accent-soft text-accent",
    info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
  };
  return <div className={`whitespace-pre-wrap rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed ${kinds[kind]}`}>{children}</div>;
}

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  const long = typeof value === "string" && value.length > 14;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-card/90 backdrop-blur-xl shadow-card">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-accent/20 to-transparent blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="relative z-10 p-6 sm:p-7">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          {label}
        </div>
        <div
          className={`mt-4 font-display tracking-tight text-foreground ${long ? "text-2xl leading-snug" : "text-4xl sm:text-5xl"}`}
        >
          {value}
        </div>
        {sub && (
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-contrast">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{sub}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm shadow-accent/30 border border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ACSES Logo" className="h-full w-full object-contain p-0.5" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-sm font-extrabold tracking-tight text-foreground">ACSES</div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-contrast">Elections</div>
        </div>
      )}
    </div>
  );
}
