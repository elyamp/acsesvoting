import Link from "next/link";
import type { ReactNode } from "react";
import Image from "next/image";
import { Logo } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";

const points = [
  "Secret, unlinkable ballots",
  "One student, one vote — enforced",
  "Official ACSES electoral platform",
];

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page hero-mesh relative flex flex-1">
      <div className="grid-lines absolute inset-0" aria-hidden />
      <div className="grain absolute inset-0" aria-hidden />

      <section className="auth-aside relative hidden w-[42%] flex-col items-center justify-center overflow-hidden border-r border-line/60 bg-accent px-10 py-8 text-center text-white lg:flex">
        <div className="auth-aside-content relative z-10 flex w-full max-w-md flex-col items-center">
          <div className="auth-logo-tile mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-2 shadow-xl">
            <Image src="/logo.png" alt="ACSES logo" width={128} height={128} className="h-full w-full object-contain" priority />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
            University of Mines and Technology
          </p>
          <h2 className="font-display mt-3 text-4xl leading-tight">
            Vote with confidence.
          </h2>
          <ul className="mt-7 space-y-3 text-left">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm font-medium text-white/90">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px]">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="absolute bottom-8 left-6 right-6 text-center text-xs text-white/60">
          Association of Computer Science &amp; Engineering Students
        </p>
      </section>

      <section className="auth-form-panel relative flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-8">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
        <div className="relative flex w-full max-w-md flex-col items-center text-center">
          <Link href="/" className="auth-brand animate-rise mb-4 inline-flex justify-center rounded-xl outline-offset-4">
            <Logo />
          </Link>
          <h1 className="animate-rise font-display text-3xl tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-1.5 text-center text-sm leading-relaxed text-muted">{subtitle}</p>
          <div className="animate-rise mt-4 w-full">{children}</div>
        </div>
      </section>
    </main>
  );
}
